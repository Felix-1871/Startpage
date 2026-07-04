#!/usr/bin/env python3
"""Minimal local proxy for the Notion API (CORS bypass for the startpage)."""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error

NOTION_API = 'https://api.notion.com/v1'
NOTION_VERSION = '2022-06-28'
PORT = 3001


class NotionProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f'[notion-proxy] {args[0]}')

    def _send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Notion-Version')

    def _json_response(self, code, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(code)
        self._send_cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self._json_response(200, {'status': 'ok'})
            return
        if self.path.startswith('/notion/search'):
            self._handle_search()
            return
        self._json_response(404, {'error': 'Not found'})

    def do_POST(self):
        if self.path.startswith('/notion/search'):
            self._handle_search()
            return
        self._json_response(404, {'error': 'Not found'})

    def _read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length <= 0:
            return b'{}'
        return self.rfile.read(length)

    def _handle_search(self):
        auth = self.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            self._json_response(401, {'error': 'Missing Authorization: Bearer <token> header'})
            return

        body = self._read_body()
        req = urllib.request.Request(
            f'{NOTION_API}/search',
            data=body,
            method='POST',
            headers={
                'Authorization': auth,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json',
            },
        )

        try:
            with urllib.request.urlopen(req) as resp:
                data = resp.read()
                self.send_response(resp.status)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as err:
            err_body = err.read().decode('utf-8', errors='replace')
            try:
                payload = json.loads(err_body)
            except json.JSONDecodeError:
                payload = {'error': err_body or err.reason}
            self._json_response(err.code, payload)


def main():
    server = HTTPServer(('localhost', PORT), NotionProxyHandler)
    print(f'Notion proxy listening on http://localhost:{PORT}')
    print('Endpoints: GET /health, POST /notion/search')
    server.serve_forever()


if __name__ == '__main__':
    main()
