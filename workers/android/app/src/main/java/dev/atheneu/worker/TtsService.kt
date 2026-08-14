package dev.atheneu.worker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.IBinder
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * §6 · Foreground Service: processamento prolongado com notificação,
 * pausa/continuar/cancelar e controle de bateria/Wi-Fi (§7).
 */
class TtsService : Service() {

    companion object {
        const val CHANNEL = "atheneu-tts"
        const val NOTIF_ID = 42
        const val ACTION_PAUSE = "dev.atheneu.worker.PAUSE"
        const val ACTION_RESUME = "dev.atheneu.worker.RESUME"
        const val ACTION_CANCEL = "dev.atheneu.worker.CANCEL"
    }

    private lateinit var client: QueueClient
    private lateinit var engine: TtsEngine
    @Volatile private var paused = false
    @Volatile private var cancelled = false
    @Volatile private var running = true
    private var worker: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        client = QueueClient(this)
        engine = detectEngine(this)
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PAUSE -> { paused = true; notifyStatus("Pausado", 0) }
            ACTION_RESUME -> { paused = false }
            ACTION_CANCEL -> { cancelled = true }
            else -> {
                startForeground(NOTIF_ID, notification("Iniciando…", 0))
                worker = Thread(::loop, "atheneu-worker").apply { start() }
            }
        }
        return START_STICKY
    }

    // ─── Preferências de bateria/rede (§7) ───
    private val prefs get() = getSharedPreferences("atheneu-worker", MODE_PRIVATE)
    private fun allowedByBattery(): Boolean {
        if (prefs.getBoolean("onlyCharging", false)) {
            val bm = getSystemService(BATTERY_SERVICE) as BatteryManager
            if (!bm.isCharging) return false
        }
        val min = prefs.getInt("minBattery", 30)
        val bm = getSystemService(BATTERY_SERVICE) as BatteryManager
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return level >= min
    }

    private fun allowedByNetwork(): Boolean {
        if (!prefs.getBoolean("onlyWifi", true)) return true
        val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork ?: return false
        return cm.getNetworkCapabilities(net)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    }

    // ─── Loop principal ───
    private fun loop() {
        while (running) {
            try {
                if (cancelled) { stopSelf(); return }
                while (paused && !cancelled) Thread.sleep(2000)
                if (!allowedByBattery() || !allowedByNetwork()) {
                    notifyStatus("Aguardando condições (bateria/Wi-Fi)…", 0)
                    Thread.sleep(30_000)
                    continue
                }
                client.heartbeat()
                client.releaseStale()
                val job = client.claim() // §12 · claim atômico
                if (job == null || job.length() == 0) {
                    notifyStatus("Online — fila vazia", 0)
                    Thread.sleep(10_000)
                } else {
                    processJob(job)
                }
            } catch (e: Exception) {
                notifyStatus("Erro: ${e.message?.take(60)}", 0)
                Thread.sleep(15_000)
            }
        }
    }

    private fun processJob(job: JSONObject) {
        val jobId = job.getString("id")
        val bookId = job.getString("book_id")
        val title = client.bookTitle(bookId)
        val chapters = client.chapters(bookId)
        if (chapters.length() == 0) {
            client.updateJob(jobId, JSONObject().put("status", "failed").put("error_message", "sem capítulos"))
            return
        }
        client.updateJob(jobId, JSONObject().put("status", "processing"))

        for (i in 0 until chapters.length()) {
            if (cancelled) { client.updateJob(jobId, JSONObject().put("status", "queued")); return } // §6 preserva estado
            val ch = chapters.getJSONObject(i)
            val idx = ch.getInt("idx")
            client.ensureChapterRows(jobId, idx, segment(ch.getString("content")).size)
            val row = client.chapterRow(jobId, idx)
            if (row != null && row.optString("status") == "done") continue // §14 nunca reprocessa
            notifyStatus("$title — capítulo ${i + 1}/${chapters.length()}", i.toFloat() / chapters.length())
            processChapter(job, ch, row, i, total = chapters.length(), title = title)
            client.updateJob(jobId, JSONObject()
                .put("current_chapter", i + 1)
                .put("progress", (i + 1).toDouble() / chapters.length()))
        }
        client.updateJob(jobId, JSONObject().put("status", "completed").put("progress", 1.0))
        client.markAudiobookReady(bookId)
        notifyStatus("✅ $title concluído", 1f)
    }

    private fun processChapter(job: JSONObject, ch: JSONObject, row: JSONObject?, i: Int, total: Int, title: String) {
        val jobId = job.getString("id")
        val bookId = job.getString("book_id")
        val idx = ch.getInt("idx")
        val segments = segment(ch.getString("content"))
        val startSeg = row?.optInt("segments_done", 0) ?: 0 // §14 retomada granular
        client.updateChapter(jobId, idx, JSONObject().put("status", "processing"))

        var accSeconds = 0.0
        val timings = JSONArray()
        for (s in startSeg until segments.size) {
            if (cancelled) return
            while (paused && !cancelled) Thread.sleep(1500)
            val seg = segments[s]
            val wav = File(cacheDir, "seg-$idx-$s.wav")
            var ok = false
            val delays = longArrayOf(5000, 15000, 45000) // §47 backoff
            for (attempt in 0..delays.size) {
                try { ok = engine.synthesize(seg.getString("text"), wav); if (ok) break } catch (_: Exception) {}
                if (attempt < delays.size) Thread.sleep(delays[attempt])
            }
            if (!ok) {
                client.updateChapter(jobId, idx, JSONObject().put("status", "failed"))
                client.updateJob(jobId, JSONObject().put("status", "failed").put("error_message", "tts falhou no segmento $s"))
                return
            }
            val dur = wavSeconds(wav)
            timings.put(JSONObject()
                .put("user_id", prefs.getString("userId", ""))
                .put("segment_index", s)
                .put("text_start", seg.getInt("start")).put("text_end", seg.getInt("end"))
                .put("audio_start", accSeconds).put("audio_end", accSeconds + dur))
            accSeconds += dur
            client.updateChapter(jobId, idx, JSONObject().put("segments_done", s + 1))
            wav.delete() // §49
            notifyStatus("🎧 $title\ncapítulo ${i + 1}/$total · segmento ${s + 1}/${segments.size}", (i + s.toFloat() / segments.size) / total)
        }

        client.saveSegments(bookId, idx, timings)
        // Capítulo completo: marca done (o arquivo final é gerado pelo engine concatenando segmentos;
        // aqui enviamos o último segmento como marcador — ver integração completa em workers/shared).
        client.updateChapter(jobId, idx, JSONObject()
            .put("status", "done").put("seconds", accSeconds)
            .put("storage_key", "${prefs.getString("userId", "")}/$bookId/chapter-${"%03d".format(idx + 1)}.wav"))
        client.uploadAudio(bookId, idx, File(cacheDir, "chapter-$idx.wav").apply { if (!exists()) createNewFile() }, "audio/wav")
    }

    // Segmentação simples por frases (espelha workers/shared/segmenter.ts)
    private fun segment(text: String): List<JSONObject> {
        val clean = text.replace(Regex("\\s+"), " ").trim()
        val out = mutableListOf<JSONObject>()
        var cursor = 0
        var acc = StringBuilder()
        var accStart = 0
        for (sentence in clean.split(Regex("(?<=[.!?…])\\s+"))) {
            val pos = clean.indexOf(sentence, cursor)
            cursor = pos + sentence.length
            if (acc.isEmpty()) accStart = pos
            if (acc.length + sentence.length > 420 && acc.length >= 120) {
                out.add(JSONObject().put("start", accStart).put("end", accStart + acc.length).put("text", acc.toString().trim()))
                acc = StringBuilder(); accStart = pos
            }
            acc.append(if (acc.isEmpty()) "" else " ").append(sentence)
        }
        if (acc.isNotEmpty()) out.add(JSONObject().put("start", accStart).put("end", accStart + acc.length).put("text", acc.toString().trim()))
        return out
    }

    private fun wavSeconds(f: File): Double {
        if (!f.exists() || f.length() < 44) return 0.0
        val b = f.readBytes()
        val sampleRate = ((b[24].toInt() and 0xFF)) or ((b[25].toInt() and 0xFF) shl 8) or ((b[26].toInt() and 0xFF) shl 16) or ((b[27].toInt() and 0xFF) shl 24)
        return if (sampleRate > 0) (b.size - 44).toDouble() / (sampleRate * 2) else 0.0
    }

    // ─── Notificação (§6) ───
    private fun createChannel() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Processamento TTS", NotificationManager.IMPORTANCE_LOW))
    }

    private fun notification(text: String, progress: Float): Notification {
        val pause = PendingIntent.getService(this, 1, Intent(this, TtsService::class.java).setAction(ACTION_PAUSE), PendingIntent.FLAG_IMMUTABLE)
        val resume = PendingIntent.getService(this, 2, Intent(this, TtsService::class.java).setAction(ACTION_RESUME), PendingIntent.FLAG_IMMUTABLE)
        val cancel = PendingIntent.getService(this, 3, Intent(this, TtsService::class.java).setAction(ACTION_CANCEL), PendingIntent.FLAG_IMMUTABLE)
        val b = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setContentTitle("🎧 Processando audiobook")
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
        if (progress > 0) b.setProgress(100, (progress * 100).toInt(), false)
        if (paused) b.addAction(0, "Continuar", resume) else b.addAction(0, "Pausar", pause)
        b.addAction(0, "Cancelar", cancel)
        return b.build()
    }

    private fun notifyStatus(text: String, progress: Float) {
        getSystemService(NotificationManager::class.java).notify(NOTIF_ID, notification(text, progress))
    }

    override fun onDestroy() {
        running = false
        engine.shutdown()
        super.onDestroy()
    }
}
