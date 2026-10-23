import http.server
import socketserver
import os
import json
import urllib.parse
import threading
import uuid
from datetime import datetime

PORT = 8080
DIRECTORY = r"c:\Undangan"
DATA_DIR = os.path.join(DIRECTORY, "data")
GUESTS_FILE = os.path.join(DATA_DIR, "guests.json")

# Thread lock for file operations
data_lock = threading.Lock()

def ensure_data_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(GUESTS_FILE):
        with open(GUESTS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)

def load_guests():
    ensure_data_file()
    with data_lock:
        try:
            with open(GUESTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading guests: {e}")
            return []

def save_guests(guests):
    ensure_data_file()
    with data_lock:
        with open(GUESTS_FILE, "w", encoding="utf-8") as f:
            json.dump(guests, f, ensure_ascii=False, indent=2)

def calculate_stats(guests):
    total = len(guests)
    present = sum(1 for g in guests if g.get("rsvp_status") == "present")
    notpresent = sum(1 for g in guests if g.get("rsvp_status") == "notpresent")
    pending = sum(1 for g in guests if g.get("rsvp_status") not in ["present", "notpresent"])
    total_pax = sum(int(g.get("pax", 0) or 0) for g in guests if g.get("rsvp_status") == "present")
    checked_in = sum(1 for g in guests if g.get("checked_in") is True)
    checked_in_pax = sum(max(int(g.get("pax", 0) or 1), 1) for g in guests if g.get("checked_in") is True)
    return {
        "total": total,
        "present": present,
        "notpresent": notpresent,
        "pending": pending,
        "total_pax": total_pax,
        "checked_in": checked_in,
        "checked_in_pax": checked_in_pax
    }

class InvitationHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Route /admin to /admin.html
        if path == "/admin" or path == "/admin/":
            self.path = "/admin.html"
            return super().do_GET()

        # Route /checkin to /checkin.html
        if path == "/checkin" or path == "/checkin/":
            self.path = "/checkin.html"
            return super().do_GET()

        # API: Get guests & stats
        if path == "/api/guests":
            guests = load_guests()
            stats = calculate_stats(guests)
            return self.send_json({"success": True, "guests": guests, "stats": stats})

        # API: Check-in Status
        if path == "/api/checkin/status":
            guest_id = query.get("id", [""])[0].strip()
            name = query.get("name", [""])[0].strip()
            guests = load_guests()
            found = None
            if guest_id:
                found = next((g for g in guests if g.get("id") == guest_id), None)
            if not found and name:
                found = next((g for g in guests if g.get("name", "").strip().lower() == name.lower()), None)
            if found:
                return self.send_json({"success": True, "guest": found})
            return self.send_json({"success": False, "message": "Tamu belum terdaftar"}, 404)

        # API: Export CSV
        if path == "/api/export":
            guests = load_guests()
            csv_lines = ["No,Nama Tamu,Sapaan,Kategori,No WhatsApp,Status RSVP,Jumlah Pax,Check-in di Lokasi,Waktu Check-in,Ucapan / Doa,Link Undangan"]
            for idx, g in enumerate(guests, 1):
                name = g.get('name', '').replace('"', '""')
                sal = g.get('salutation', '').replace('"', '""')
                cat = g.get('category', '').replace('"', '""')
                phone = g.get('phone', '')
                status = g.get('rsvp_status', 'pending')
                status_label = "Hadir" if status == "present" else ("Tidak Hadir" if status == "notpresent" else "Belum Konfirmasi")
                pax = str(g.get('pax', 0))
                is_checkin = "Sudah Check-in" if g.get('checked_in') else "Belum Check-in"
                checkin_time = g.get('checkin_time', '') or '-'
                msg = g.get('message', '').replace('"', '""').replace('\n', ' ')
                encoded_name = urllib.parse.quote_plus(g.get('name', ''))
                guest_id = g.get('id', '')
                link = f"http://localhost:8080/?to={encoded_name}&id={guest_id}"
                csv_lines.append(f'"{idx}","{name}","{sal}","{cat}","{phone}","{status_label}","{pax}","{is_checkin}","{checkin_time}","{msg}","{link}"')

            csv_body = "\r\n".join(csv_lines).encode('utf-8-sig') # UTF-8 with BOM for Excel
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv; charset=utf-8')
            self.send_header('Content-Disposition', 'attachment; filename="daftar_tamu_anita_olga.csv"')
            self.send_header('Content-Length', str(len(csv_body)))
            self.end_headers()
            self.wfile.write(csv_body)
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(body_bytes.decode('utf-8'))
        except Exception:
            data = {}

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

        # API: QR Check-in Scan Endpoint
        if path == "/api/checkin":
            raw_code = str(data.get("code", "")).strip()
            guest_id = str(data.get("id", "")).strip()
            guest_name = str(data.get("name", "")).strip()

            # Parse QR code if it contains a URL or query string
            if raw_code:
                if "?" in raw_code:
                    parsed_code = urllib.parse.urlparse(raw_code)
                    qs = urllib.parse.parse_qs(parsed_code.query)
                    if "id" in qs and qs["id"][0]:
                        guest_id = qs["id"][0].strip()
                    if "name" in qs and qs["name"][0]:
                        guest_name = qs["name"][0].strip()
                    elif "to" in qs and qs["to"][0]:
                        guest_name = qs["to"][0].strip()
                elif raw_code.startswith("gst_"):
                    guest_id = raw_code
                else:
                    guest_name = raw_code

            guests = load_guests()
            target = None

            # 1. Match by id
            if guest_id:
                target = next((g for g in guests if g.get("id") == guest_id), None)

            # 2. Match by name
            if not target and guest_name:
                target = next((g for g in guests if g.get("name", "").strip().lower() == guest_name.lower()), None)

            if target:
                already = bool(target.get("checked_in"))
                target["checked_in"] = True
                if not target.get("checkin_time"):
                    target["checkin_time"] = now_str
                # Check-in confirms presence
                target["rsvp_status"] = "present"
                if not target.get("pax") or int(target.get("pax", 0)) < 1:
                    target["pax"] = 1
                target["updated_at"] = now_str
                save_guests(guests)

                msg = f"Tamu '{target['name']}' sudah check-in pada {target['checkin_time']}." if already else f"Check-in Berhasil! Selamat datang, {target['name']}."
                return self.send_json({
                    "success": True,
                    "already_checked_in": already,
                    "guest": target,
                    "stats": calculate_stats(guests),
                    "message": msg
                })

            # If not found but we have a name, create new guest as walk-in check-in
            if guest_name:
                new_g = {
                    "id": f"gst_{uuid.uuid4().hex[:8]}",
                    "name": guest_name,
                    "salutation": "Bapak/Ibu/Saudara/i",
                    "phone": "",
                    "category": "Check-in Lokasi",
                    "rsvp_status": "present",
                    "pax": 1,
                    "message": "",
                    "checked_in": True,
                    "checkin_time": now_str,
                    "created_at": now_str,
                    "updated_at": now_str
                }
                guests.append(new_g)
                save_guests(guests)
                return self.send_json({
                    "success": True,
                    "already_checked_in": False,
                    "guest": new_g,
                    "stats": calculate_stats(guests),
                    "message": f"Tamu '{guest_name}' berhasil didaftarkan & check-in!"
                })

            return self.send_json({"success": False, "message": "Kode QR atau data tamu tidak valid."}, 400)

        # API: Undo Check-in
        if path == "/api/undo-checkin":
            guest_id = str(data.get("id", "")).strip()
            if not guest_id:
                return self.send_json({"success": False, "message": "ID diperlukan"}, 400)

            guests = load_guests()
            found = False
            for g in guests:
                if g.get("id") == guest_id:
                    g["checked_in"] = False
                    g["checkin_time"] = None
                    g["updated_at"] = now_str
                    found = True
                    break

            if found:
                save_guests(guests)
                return self.send_json({
                    "success": True,
                    "message": "Status check-in berhasil dibatalkan.",
                    "stats": calculate_stats(guests)
                })
            return self.send_json({"success": False, "message": "Tamu tidak ditemukan"}, 404)

        # API: Add guest(s)
        if path == "/api/guests":
            guests = load_guests()

            # Check if bulk mode
            if data.get("bulk") and isinstance(data.get("names"), list):
                category = data.get("category", "Umum").strip() or "Umum"
                salutation = data.get("salutation", "Bapak/Ibu/Saudara/i").strip() or "Bapak/Ibu/Saudara/i"
                added = []
                for name_entry in data.get("names", []):
                    clean_name = str(name_entry).strip()
                    if clean_name:
                        new_g = {
                            "id": f"gst_{uuid.uuid4().hex[:8]}",
                            "name": clean_name,
                            "salutation": salutation,
                            "phone": "",
                            "category": category,
                            "rsvp_status": "pending",
                            "pax": 0,
                            "message": "",
                            "checked_in": False,
                            "checkin_time": None,
                            "created_at": now_str,
                            "updated_at": now_str
                        }
                        guests.append(new_g)
                        added.append(new_g)
                save_guests(guests)
                return self.send_json({
                    "success": True, 
                    "message": f"{len(added)} tamu berhasil ditambahkan.", 
                    "count": len(added),
                    "stats": calculate_stats(guests)
                })

            # Single guest mode
            name = str(data.get("name", "")).strip()
            if not name:
                return self.send_json({"success": False, "message": "Nama tamu tidak boleh kosong."}, 400)

            new_guest = {
                "id": f"gst_{uuid.uuid4().hex[:8]}",
                "name": name,
                "salutation": str(data.get("salutation", "Bapak/Ibu/Saudara/i")).strip() or "Bapak/Ibu/Saudara/i",
                "phone": str(data.get("phone", "")).strip(),
                "category": str(data.get("category", "Umum")).strip() or "Umum",
                "rsvp_status": str(data.get("rsvp_status", "pending")),
                "pax": int(data.get("pax", 0) or 0),
                "message": str(data.get("message", "")).strip(),
                "checked_in": False,
                "checkin_time": None,
                "created_at": now_str,
                "updated_at": now_str
            }
            guests.append(new_guest)
            save_guests(guests)
            return self.send_json({
                "success": True, 
                "message": f"Tamu '{name}' berhasil ditambahkan.", 
                "guest": new_guest,
                "stats": calculate_stats(guests)
            })

        # API: RSVP submit from wedding page
        if path == "/api/rsvp":
            author = str(data.get("name", "")).strip()
            attendance = str(data.get("attendance", "notpresent"))
            pax = int(data.get("pax", 1) if attendance == "present" else 0)
            msg = str(data.get("message", "")).strip()

            if not author:
                return self.send_json({"success": False, "message": "Nama tidak boleh kosong."}, 400)

            guests = load_guests()
            matched = False
            for g in guests:
                if g.get("name", "").strip().lower() == author.lower():
                    g["rsvp_status"] = attendance
                    g["pax"] = pax
                    if msg:
                        g["message"] = msg
                    g["updated_at"] = now_str
                    matched = True
                    break

            if not matched:
                new_entry = {
                    "id": f"gst_{uuid.uuid4().hex[:8]}",
                    "name": author,
                    "salutation": "Bapak/Ibu/Saudara/i",
                    "phone": "",
                    "category": "RSVP Mandiri",
                    "rsvp_status": attendance,
                    "pax": pax,
                    "message": msg,
                    "checked_in": False,
                    "checkin_time": None,
                    "created_at": now_str,
                    "updated_at": now_str
                }
                guests.append(new_entry)

            save_guests(guests)
            return self.send_json({"success": True, "message": "Konfirmasi RSVP berhasil disimpan!"})

        self.send_json({"error": "Endpoint not found"}, 404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/guests":
            content_length = int(self.headers.get('Content-Length', 0))
            body_bytes = self.rfile.read(content_length) if content_length > 0 else b'{}'
            try:
                data = json.loads(body_bytes.decode('utf-8'))
            except Exception:
                return self.send_json({"success": False, "message": "Invalid JSON"}, 400)

            guest_id = data.get("id")
            if not guest_id:
                return self.send_json({"success": False, "message": "Guest ID diperlukan"}, 400)

            guests = load_guests()
            found = False
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

            for g in guests:
                if g.get("id") == guest_id:
                    if "name" in data: g["name"] = str(data["name"]).strip()
                    if "salutation" in data: g["salutation"] = str(data["salutation"]).strip()
                    if "phone" in data: g["phone"] = str(data["phone"]).strip()
                    if "category" in data: g["category"] = str(data["category"]).strip()
                    if "rsvp_status" in data: g["rsvp_status"] = str(data["rsvp_status"])
                    if "pax" in data: g["pax"] = int(data["pax"] or 0)
                    if "message" in data: g["message"] = str(data["message"]).strip()
                    if "checked_in" in data: 
                        g["checked_in"] = bool(data["checked_in"])
                        if g["checked_in"] and not g.get("checkin_time"):
                            g["checkin_time"] = now_str
                        elif not g["checked_in"]:
                            g["checkin_time"] = None
                    g["updated_at"] = now_str
                    found = True
                    break

            if found:
                save_guests(guests)
                return self.send_json({"success": True, "message": "Data tamu berhasil diperbarui.", "stats": calculate_stats(guests)})
            else:
                return self.send_json({"success": False, "message": "Tamu tidak ditemukan"}, 404)

        self.send_json({"error": "Endpoint not found"}, 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/guests":
            guest_id = query.get("id", [""])[0]
            if not guest_id:
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length > 0:
                    try:
                        data = json.loads(self.rfile.read(content_length).decode('utf-8'))
                        guest_id = data.get("id", "")
                    except Exception:
                        pass

            if not guest_id:
                return self.send_json({"success": False, "message": "Guest ID diperlukan"}, 400)

            guests = load_guests()
            new_guests = [g for g in guests if g.get("id") != guest_id]
            if len(new_guests) < len(guests):
                save_guests(new_guests)
                return self.send_json({"success": True, "message": "Tamu berhasil dihapus.", "stats": calculate_stats(new_guests)})
            else:
                return self.send_json({"success": False, "message": "Tamu tidak ditemukan"}, 404)

        self.send_json({"error": "Endpoint not found"}, 404)

class ThreadingServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == "__main__":
    ensure_data_file()
    print(f"Starting server at http://localhost:{PORT}")
    print(f"Admin Dashboard available at: http://localhost:{PORT}/admin")
    with ThreadingServer(("", PORT), InvitationHandler) as httpd:
        httpd.serve_forever()
