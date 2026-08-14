package dev.atheneu.worker

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Cliente da fila de TTS no Supabase (REST puro, sem chaves administrativas — §42).
 * Opera com o JWT do usuário autenticado; o RLS garante o isolamento.
 */
class QueueClient(context: Context) {
    private val prefs = context.getSharedPreferences("atheneu-worker", Context.MODE_PRIVATE)

    val supabaseUrl: String get() = prefs.getString("url", "") ?: ""
    private val anonKey: String get() = prefs.getString("anon", "") ?: ""
    private var token: String? get() = prefs.getString("token", null)
        set(v) = prefs.edit().putString("token", v).apply()
    val workerId: String? get() = prefs.getString("workerId", null)
    val userEmail: String get() = prefs.getString("email", "") ?: ""

    fun configure(url: String, anon: String) = prefs.edit().putString("url", url).putString("anon", anon).apply()

    // ─── Auth (§43) ───
    fun signIn(email: String, password: String): String? {
        val body = JSONObject().put("email", email).put("password", password)
        val res = post("$supabaseUrl/auth/v1/token?grant_type=password", body, withAuth = false)
            ?: return null
        token = res.getString("access_token")
        val userId = res.getJSONObject("user").optString("id")
        prefs.edit().putString("email", email).putString("userId", userId).apply()
        return userId
    }

    fun signOut() = prefs.edit().remove("token").remove("workerId").apply()

    // ─── Registro do dispositivo (§10) ───
    fun ensureWorker(deviceName: String, engine: String): String {
        workerId?.let { return it }
        val body = JSONObject()
            .put("device_name", deviceName)
            .put("platform", "android")
            .put("status", "online")
            .put("engine", engine)
            .put("cpu", Runtime.getRuntime().availableProcessors().toString() + " núcleos")
        val arr = insert("workers", body)
        val id = arr.getJSONObject(0).getString("id")
        prefs.edit().putString("workerId", id).apply()
        return id
    }

    // ─── Fila (§11, §12) ───
    fun heartbeat() { rpc("heartbeat_worker", JSONObject().put("p_worker", workerId)) }

    fun releaseStale() { rpc("release_stale_tts_jobs", JSONObject().put("p_timeout_seconds", 300)) }

    fun claim(): JSONObject? {
        val res = rpc("claim_next_tts_job", JSONObject().put("p_worker", workerId)) ?: return null
        return if (res.length() == 0) null else res
    }

    fun chapters(bookId: String): JSONArray =
        select("book_chapters", "book_id=eq.$bookId&order=idx") ?: JSONArray()

    fun bookTitle(bookId: String): String {
        val arr = select("books", "id=eq.$bookId&select=title") ?: return ""
        return if (arr.length() > 0) arr.getJSONObject(0).optString("title") else ""
    }

    fun ensureChapterRows(jobId: String, chapterIdx: Int, segmentsTotal: Int) {
        val existing = select("tts_job_chapters", "job_id=eq.$jobId&chapter_idx=eq.$chapterIdx")
        if (existing != null && existing.length() > 0) return
        insert("tts_job_chapters", JSONObject()
            .put("job_id", jobId).put("chapter_idx", chapterIdx)
            .put("status", "pending").put("segments_total", segmentsTotal))
    }

    fun chapterRow(jobId: String, chapterIdx: Int): JSONObject? {
        val arr = select("tts_job_chapters", "job_id=eq.$jobId&chapter_idx=eq.$chapterIdx")
        return if (arr != null && arr.length() > 0) arr.getJSONObject(0) else null
    }

    fun updateJob(jobId: String, patch: JSONObject) = patchRow("tts_jobs", "id=eq.$jobId", patch)
    fun updateChapter(jobId: String, idx: Int, patch: JSONObject) =
        patchRow("tts_job_chapters", "job_id=eq.$jobId&chapter_idx=eq.$idx", patch)

    fun saveSegments(bookId: String, chapterIdx: Int, segments: JSONArray) {
        delete("audio_segments", "book_id=eq.$bookId&chapter_idx=eq.$chapterIdx")
        for (i in 0 until segments.length()) {
            segments.getJSONObject(i).put("book_id", bookId).put("chapter_idx", chapterIdx)
        }
        insertMany("audio_segments", segments)
    }

    fun markAudiobookReady(bookId: String) {
        insert("audiobooks", JSONObject().put("book_id", bookId).put("status", "ready"), upsertConflict = true)
    }

    // ─── Upload (§15, §16): {user}/{book}/chapter-NNN.ext — só a própria pasta, via RLS do storage ───
    fun uploadAudio(bookId: String, chapterIdx: Int, file: File, contentType: String): Boolean {
        val userId = prefs.getString("userId", "") ?: return false
        val ext = if (file.name.endsWith(".mp3")) "mp3" else "wav"
        val path = "$userId/$bookId/chapter-${"%03d".format(chapterIdx + 1)}.$ext"
        val conn = open("$supabaseUrl/storage/v1/object/audio/$path", "POST")
        conn.setRequestProperty("Content-Type", contentType)
        conn.doOutput = true
        file.inputStream().use { it.copyTo(conn.outputStream) }
        val ok = conn.responseCode in 200..299
        conn.disconnect()
        return ok
    }

    // ─── HTTP genérico ───
    private fun open(url: String, method: String): HttpURLConnection {
        val c = URL(url).openConnection() as HttpURLConnection
        c.requestMethod = method
        c.setRequestProperty("apikey", anonKey)
        c.setRequestProperty("Prefer", "return=representation")
        token?.let { c.setRequestProperty("Authorization", "Bearer $it") }
        c.connectTimeout = 20_000
        c.readTimeout = 60_000
        return c
    }

    private fun post(url: String, body: JSONObject, withAuth: Boolean = true): JSONObject? {
        val c = URL(url).openConnection() as HttpURLConnection
        c.requestMethod = "POST"
        c.setRequestProperty("apikey", anonKey)
        c.setRequestProperty("Content-Type", "application/json")
        if (withAuth) token?.let { c.setRequestProperty("Authorization", "Bearer $it") }
        c.doOutput = true
        c.outputStream.use { it.write(body.toString().toByteArray()) }
        if (c.responseCode !in 200..299) return null
        return JSONObject(c.inputStream.bufferedReader().readText())
    }

    private fun select(table: String, query: String): JSONArray? {
        val c = open("$supabaseUrl/rest/v1/$table?select=*&$query", "GET")
        if (c.responseCode != 200) { c.disconnect(); return null }
        val arr = JSONArray(c.inputStream.bufferedReader().readText())
        c.disconnect()
        return arr
    }

    private fun insert(table: String, body: JSONObject, upsertConflict: Boolean = false): JSONArray {
        val url = if (upsertConflict) "$supabaseUrl/rest/v1/$table?on_conflict=book_id" else "$supabaseUrl/rest/v1/$table"
        val c = open(url, "POST")
        c.setRequestProperty("Content-Type", "application/json")
        c.doOutput = true
        c.outputStream.use { it.write(body.toString().toByteArray()) }
        val text = c.inputStream.bufferedReader().readText()
        c.disconnect()
        return JSONArray(text)
    }

    private fun insertMany(table: String, rows: JSONArray) {
        val c = open("$supabaseUrl/rest/v1/$table", "POST")
        c.setRequestProperty("Content-Type", "application/json")
        c.doOutput = true
        c.outputStream.use { it.write(rows.toString().toByteArray()) }
        c.disconnect()
    }

    private fun patchRow(table: String, filter: String, patch: JSONObject) {
        val c = open("$supabaseUrl/rest/v1/$table?$filter", "PATCH")
        c.setRequestProperty("Content-Type", "application/json")
        c.doOutput = true
        c.outputStream.use { it.write(patch.toString().toByteArray()) }
        c.disconnect()
    }

    private fun delete(table: String, filter: String) {
        val c = open("$supabaseUrl/rest/v1/$table?$filter", "DELETE")
        c.responseCode
        c.disconnect()
    }

    private fun rpc(fn: String, args: JSONObject): JSONObject? {
        val c = open("$supabaseUrl/rest/v1/rpc/$fn", "POST")
        c.setRequestProperty("Content-Type", "application/json")
        c.doOutput = true
        c.outputStream.use { it.write(args.toString().toByteArray()) }
        if (c.responseCode !in 200..299) { c.disconnect(); return null }
        val text = c.inputStream.bufferedReader().readText().trim()
        c.disconnect()
        if (text.startsWith("[")) {
            val arr = JSONArray(text)
            return if (arr.length() > 0) arr.getJSONObject(0) else JSONObject()
        }
        return if (text.isEmpty()) JSONObject() else JSONObject(text)
    }
}
