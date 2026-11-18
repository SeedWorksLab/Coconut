package com.coconut.update

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

class CoconutUpdateModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CoconutUpdate")

    AsyncFunction("downloadApk") Coroutine { url: String, version: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Coconut is not running.")
      val uri = Uri.parse(url)
      require(uri.scheme == "https" && !uri.host.isNullOrBlank()) {
        "The update download must use HTTPS."
      }
      val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      val fileName = "coconut-${version.replace(Regex("[^a-zA-Z0-9._-]"), "_")}-${System.currentTimeMillis()}.apk"
      val request = DownloadManager.Request(uri)
        .setTitle("Coconut $version")
        .setDescription("Downloading Coconut update")
        .setMimeType("application/vnd.android.package-archive")
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, fileName)
      withContext(Dispatchers.IO) {
        val id = manager.enqueue(request)
        var contentUri: String? = null
        while (contentUri == null) {
          manager.query(DownloadManager.Query().setFilterById(id)).use { cursor ->
            check(cursor.moveToFirst()) { "The update download was cancelled." }
            when (cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))) {
              DownloadManager.STATUS_SUCCESSFUL -> {
                contentUri = manager.getUriForDownloadedFile(id)?.toString()
                  ?: throw IllegalStateException("The downloaded APK could not be opened.")
              }
              DownloadManager.STATUS_FAILED -> {
                val reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
                throw IllegalStateException("APK download failed ($reason). Please try again.")
              }
            }
          }
          if (contentUri == null) delay(500)
        }
        contentUri
      }
    }
  }
}
