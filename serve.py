"""خادم معاينة محلي لنماذج سيّار.

يمنع المتصفح من الاحتفاظ بنسخ قديمة (Cache-Control: no-store) حتى تظهر كل
التعديلات فوراً على الكمبيوتر والموبايل، ويستمع على كل الشبكة ليفتح من الهاتف.
التشغيل: python serve.py  ثم افتح http://<عنوان-الكمبيوتر>:8767/design/index.html
"""
import http.server
import os
import socketserver

PORT = 8767
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # نعلن الترميز صراحةً حتى تُقرأ الحروف العربية صحيحة على كل المتصفحات
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".svg": "image/svg+xml; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".md": "text/markdown; charset=utf-8",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("0.0.0.0", PORT), NoCacheHandler) as httpd:
        print(f"Serving {ROOT} on port {PORT} (no-cache)")
        httpd.serve_forever()
