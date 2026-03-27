# ============================================================================
# Gunicorn Configuration File (Production)
# ============================================================================
# https://docs.gunicorn.org/en/stable/settings.html

import multiprocessing
import os

# Server Socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker Processes
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "sync"  # sync avoids heap corruption with numpy/scipy/joblib in subprocesses
threads = 1  # Not used with sync, but kept for reference
worker_connections = 1000
max_requests = 1000  # Restart workers after N requests (prevents memory leaks)
max_requests_jitter = 50  # Randomize max_requests to prevent all workers restarting simultaneously
timeout = 120  # Workers silent for more than this many seconds are killed and restarted
graceful_timeout = 30  # Timeout for graceful workers restart
keepalive = 2  # Keep-alive

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process Naming
proc_name = "nlp_analysis_backend"

# Server Mechanics
daemon = False  # Run in foreground (required for Docker)
pidfile = None  # Don't create pidfile
umask = 0
user = None  # Run as current user (django user in Docker)
group = None
tmp_upload_dir = None

# SSL (if needed - typically handled by nginx/load balancer)
# keyfile = None
# certfile = None

# Security
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

# Server Hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("Gunicorn master process starting")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("Gunicorn reloading workers")

def when_ready(server):
    """Called just after the server is started."""
    server.log.info(f"Gunicorn is ready. Listening at: {server.address}")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def pre_exec(server):
    """Called just before a new master process is forked."""
    server.log.info("Forked child, re-executing")

def on_exit(server):
    """Called just before exiting Gunicorn."""
    server.log.info("Gunicorn master process exiting")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    worker.log.info(f"Worker received INT or QUIT signal (pid: {worker.pid})")

def worker_abort(worker):
    """Called when a worker received the SIGABRT signal."""
    worker.log.info(f"Worker received SIGABRT signal (pid: {worker.pid})")
