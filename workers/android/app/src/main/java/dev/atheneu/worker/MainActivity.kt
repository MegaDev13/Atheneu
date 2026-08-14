package dev.atheneu.worker

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {

    private lateinit var client: QueueClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        client = QueueClient(this)
        val url = findViewById<EditText>(R.id.url)
        val anon = findViewById<EditText>(R.id.anon)
        val email = findViewById<EditText>(R.id.email)
        val pass = findViewById<EditText>(R.id.password)
        val status = findViewById<TextView>(R.id.status)
        val start = findViewById<Button>(R.id.start)
        val stop = findViewById<Button>(R.id.stop)
        val onlyWifi = findViewById<CheckBox>(R.id.onlyWifi)
        val onlyCharging = findViewById<CheckBox>(R.id.onlyCharging)

        // Defaults vindos de docs (§52): o usuário cola URL/anon do próprio projeto.
        url.setText(client.supabaseUrl)
        email.setText(client.userEmail)

        val prefs = getSharedPreferences("atheneu-worker", MODE_PRIVATE)
        onlyWifi.isChecked = prefs.getBoolean("onlyWifi", true)
        onlyCharging.isChecked = prefs.getBoolean("onlyCharging", false)
        onlyWifi.setOnCheckedChangeListener { _, v -> prefs.edit().putBoolean("onlyWifi", v).apply() }
        onlyCharging.setOnCheckedChangeListener { _, v -> prefs.edit().putBoolean("onlyCharging", v).apply() }

        askNotificationPermission()

        start.setOnClickListener {
            val u = url.text.toString().trim()
            val a = anon.text.toString().trim()
            val e = email.text.toString().trim()
            val p = pass.text.toString()
            if (u.isEmpty() || a.isEmpty() || e.isEmpty() || p.isEmpty()) {
                Toast.makeText(this, "Preencha URL, chave anon, e-mail e senha.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            client.configure(u, a)
            status.text = "Entrando…"
            thread {
                try {
                    client.signIn(e, p)
                    val engine = detectEngine(this)
                    client.ensureWorker(Build.MODEL, engine.name)
                    engine.shutdown()
                    runOnUiThread {
                        status.text = "🟢 Conectado como $e\nWorker registrado (${Build.MODEL})."
                        ContextCompat.startForegroundService(this, Intent(this, TtsService::class.java))
                        Toast.makeText(this, "Worker iniciado em segundo plano.", Toast.LENGTH_SHORT).show()
                    }
                } catch (ex: Exception) {
                    runOnUiThread { status.text = "Erro: ${ex.message}" }
                }
            }
        }

        stop.setOnClickListener {
            stopService(Intent(this, TtsService::class.java))
            status.text = "⚪ Worker parado (o estado dos trabalhos está preservado)."
        }
    }

    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
    }
}
