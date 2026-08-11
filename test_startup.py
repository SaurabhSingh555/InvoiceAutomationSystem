import subprocess
import time
import urllib.request

def test_backend():
    print("Starting backend...")
    proc = subprocess.Popen(["python", "-m", "uvicorn", "app.main:app", "--port", "8000"], cwd="backend")
    time.sleep(3)
    try:
        req = urllib.request.Request("http://localhost:8000/api/health")
        with urllib.request.urlopen(req) as response:
            print("Health:", response.getcode(), response.read().decode())
    except Exception as e:
        print("Error:", e)
    finally:
        proc.terminate()

test_backend()
