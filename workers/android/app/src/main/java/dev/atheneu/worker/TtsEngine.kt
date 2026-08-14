package dev.atheneu.worker

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import java.io.File
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Camada abstrata de engines (§3 da extensão).
 * Novos provedores (Kokoro, Piper, OpenAI, ElevenLabs…) implementam esta
 * interface sem alterar o restante do Worker.
 */
interface TtsEngine {
    val name: String
    fun init(context: Context): Boolean
    fun synthesize(text: String, outFile: File): Boolean
    fun shutdown() {}
}

/** Engine do sistema: funciona em qualquer aparelho, sem dependências. */
class SystemTtsEngine : TtsEngine {
    override val name = "sistema"
    private var tts: TextToSpeech? = null

    override fun init(context: Context): Boolean {
        val latch = CountDownLatch(1)
        var ok = false
        tts = TextToSpeech(context) { status ->
            ok = status == TextToSpeech.SUCCESS
            latch.countDown()
        }
        latch.await(10, TimeUnit.SECONDS)
        if (ok) tts?.language = Locale.forLanguageTag("pt-BR")
        return ok
    }

    override fun synthesize(text: String, outFile: File): Boolean {
        val engine = tts ?: return false
        val latch = CountDownLatch(1)
        var done = false
        val utterance = "atheneu-${System.nanoTime()}"
        val params = Bundle()
        engine.setOnUtteranceProgressListener(object : android.speech.tts.UtteranceProgressListener() {
            override fun onStart(id: String?) {}
            override fun onError(id: String?) { latch.countDown() }
            override fun onDone(id: String?) { if (id == utterance) { done = true; latch.countDown() } }
        })
        engine.synthesizeToFile(text, params, outFile, utterance)
        latch.await(10, TimeUnit.MINUTES)
        return done && outFile.exists() && outFile.length() > 200
    }

    override fun shutdown() { tts?.stop(); tts?.shutdown() }
}

/**
 * Kokoro via sherpa-onnx — PONTO DE INTEGRAÇÃO (§4).
 * 1) Descomente a dependência em app/build.gradle.kts.
 * 2) Coloque kokoro-v1.0.onnx + voices-v1.0.bin em app/src/main/assets/.
 * 3) Substitua o corpo de synthesize pela API do sherpa-onnx
 *    (OfflineTts / OfflineTtsKokoroModelConfig).
 */
class KokoroEngine : TtsEngine {
    override val name = "kokoro"
    override fun init(context: Context): Boolean {
        return File(context.filesDir, "kokoro-v1.0.onnx").exists() // TODO: copiar de assets
    }
    override fun synthesize(text: String, outFile: File): Boolean {
        // TODO(sherpa-onnx): OfflineTts().generate(KokoroConfig, text, sid=voz, speed)
        return false
    }
}

/** Detecta o melhor engine disponível no aparelho (Kokoro → sistema). */
fun detectEngine(context: Context): TtsEngine {
    val kokoro = KokoroEngine()
    if (kokoro.init(context)) return kokoro
    val system = SystemTtsEngine()
    if (system.init(context)) return system
    return system
}
