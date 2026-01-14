#!/usr/bin/env python3
"""
HSBC Bot Companion - Native Messaging Host for Bank Reconciliation

Receives commands from Chrome extension via stdin, executes reconciliation,
and returns results via stdout using Chrome Native Messaging protocol.

Message Format (length-prefixed JSON):
- Input:  4-byte little-endian length + JSON bytes
- Output: 4-byte little-endian length + JSON bytes

Commands:
- ping: Health check, returns version info
- run_reconciliation: Execute run_all.py --bank HSBC

Author: DeyaAldeen AlSoub
Version: 1.0.0
"""

import sys
import os
import json
import struct
import subprocess
import re
from pathlib import Path
from datetime import datetime

# === CONFIGURATION ===

# Config file path (relative to this script)
SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR / "config.json"

# Default values (used if config.json missing or invalid)
DEFAULT_BANKRECON_DIR = Path(r"C:\Users\ASUS\Desktop\Recon Project\Matching Files\BNP")
DEFAULT_RUN_ALL_SCRIPT = "BankRecon_Python_Engine\\run_all.py"

# Timeout for reconciliation (30 minutes - can take a while for many accounts)
TIMEOUT_SECONDS = 1800

# Version info
VERSION = "1.1.1"


def load_config():
    """
    Load configuration from config.json.
    Returns tuple of (bankrecon_dir: Path, run_all_script: Path, error: str|None)
    """
    if not CONFIG_FILE.exists():
        return DEFAULT_BANKRECON_DIR, DEFAULT_BANKRECON_DIR / DEFAULT_RUN_ALL_SCRIPT, "config.json not found, using defaults"

    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8-sig') as f:
            config = json.load(f)

        bankrecon_dir = Path(config.get("bankrecon_dir", str(DEFAULT_BANKRECON_DIR)))
        run_all_script_rel = config.get("run_all_script", DEFAULT_RUN_ALL_SCRIPT)
        run_all_script = bankrecon_dir / run_all_script_rel

        return bankrecon_dir, run_all_script, None
    except json.JSONDecodeError as e:
        return DEFAULT_BANKRECON_DIR, DEFAULT_BANKRECON_DIR / DEFAULT_RUN_ALL_SCRIPT, f"config.json parse error: {e}"
    except Exception as e:
        return DEFAULT_BANKRECON_DIR, DEFAULT_BANKRECON_DIR / DEFAULT_RUN_ALL_SCRIPT, f"config load error: {e}"


# Load configuration
BANKRECON_DIR, RUN_ALL_SCRIPT, CONFIG_ERROR = load_config()


# === NATIVE MESSAGING PROTOCOL ===

def read_message():
    """
    Read a message from stdin using Chrome native messaging format.

    Format: 4-byte little-endian length prefix followed by JSON bytes.
    Returns None if stdin is closed.
    """
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None
    message_length = struct.unpack('<I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)


def send_message(message):
    """
    Send a message to stdout using Chrome native messaging format.

    Format: 4-byte little-endian length prefix followed by JSON bytes.
    """
    encoded = json.dumps(message, ensure_ascii=False).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('<I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def send_error(error_message, error_code="UNKNOWN_ERROR"):
    """Send a standardized error response."""
    send_message({
        "success": False,
        "error": error_message,
        "errorCode": error_code,
        "timestamp": datetime.now().isoformat()
    })


# === RECONCILIATION EXECUTION ===

def extract_json_result(output: str) -> dict:
    """
    Extract the LAST JSON result from script output between markers.

    run_all.py outputs JSON between JSON_RESULT_START and JSON_RESULT_END markers.
    Multiple sub-scripts may output their own markers, so we need the LAST one
    which is the final summary from run_all.py.
    """
    matches = re.findall(
        r'JSON_RESULT_START\s*(.*?)\s*JSON_RESULT_END',
        output,
        re.DOTALL
    )
    if matches:
        # Take the LAST match (run_all.py's final output)
        try:
            return json.loads(matches[-1])
        except json.JSONDecodeError as e:
            return {"parseError": str(e), "rawMatch": matches[-1][:500]}
    return None


def run_reconciliation(bank="HSBC", options=None):
    """
    Execute run_all.py and return results.

    Args:
        bank: Bank filter (HSBC, BNP, or ALL)
        options: Dict with optional flags (skipCashbook, skipDistribution, etc.)

    Returns:
        Dict with success status, timing, step results, and any errors
    """
    options = options or {}

    # Validate BankRecon directory exists
    if not BANKRECON_DIR.exists():
        return {
            "success": False,
            "error": f"BankRecon directory not found: {BANKRECON_DIR}",
            "errorCode": "DIR_NOT_FOUND"
        }

    # Validate script exists
    if not RUN_ALL_SCRIPT.exists():
        return {
            "success": False,
            "error": f"run_all.py not found at {RUN_ALL_SCRIPT}",
            "errorCode": "SCRIPT_NOT_FOUND"
        }

    # Build command with options
    cmd = [sys.executable, str(RUN_ALL_SCRIPT), "--bank", bank]

    # Add optional flags
    if options.get("skipCashbook"):
        cmd.append("--skip-cashbook")
    if options.get("skipDistribution"):
        cmd.append("--skip-hsbc-distribution")
    if options.get("skipBnpDistribution"):
        cmd.append("--skip-bnp-distribution")
    if options.get("forceReconsolidate"):
        cmd.extend(["--force-reconsolidate"])
    if options.get("month"):
        cmd.extend(["--month", options["month"]])
    if options.get("entity"):
        cmd.extend(["--entity", options["entity"]])

    try:
        # Execute from parent BNP directory (required by run_all.py path resolution)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(BANKRECON_DIR),
            timeout=TIMEOUT_SECONDS
        )

        # Combine stdout and stderr
        output = result.stdout + "\n" + result.stderr

        # Try to extract structured JSON result
        json_result = extract_json_result(output)

        if json_result:
            # Add metadata
            json_result["timestamp"] = datetime.now().isoformat()
            json_result["returnCode"] = result.returncode
            return json_result
        else:
            # Fallback: return raw output info
            return {
                "success": result.returncode == 0,
                "returnCode": result.returncode,
                "message": "Reconciliation completed" if result.returncode == 0 else "Reconciliation failed",
                "output": output[:3000],  # Truncate for message size limit
                "timestamp": datetime.now().isoformat()
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": f"Reconciliation timed out after {TIMEOUT_SECONDS} seconds ({TIMEOUT_SECONDS // 60} minutes)",
            "errorCode": "TIMEOUT",
            "timestamp": datetime.now().isoformat()
        }
    except FileNotFoundError as e:
        return {
            "success": False,
            "error": f"Python interpreter not found: {e}",
            "errorCode": "PYTHON_NOT_FOUND",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "errorCode": "EXECUTION_ERROR",
            "timestamp": datetime.now().isoformat()
        }


# === COMMAND HANDLERS ===

def handle_ping():
    """Health check - verify host is running and configured correctly."""
    checks = {
        "configFile": CONFIG_FILE.exists(),
        "configError": CONFIG_ERROR,
        "bankReconDir": BANKRECON_DIR.exists(),
        "bankReconDirPath": str(BANKRECON_DIR),
        "runAllScript": RUN_ALL_SCRIPT.exists(),
        "runAllScriptPath": str(RUN_ALL_SCRIPT),
        "pythonVersion": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    }

    return {
        "success": True,
        "message": "Native host is available",
        "version": VERSION,
        "checks": checks,
        "timestamp": datetime.now().isoformat()
    }


def handle_command(message):
    """
    Process incoming command and return response.

    Supported commands:
    - ping: Health check
    - run_reconciliation: Execute bank reconciliation
    """
    command = message.get("command")

    if command == "ping":
        return handle_ping()

    elif command == "run_reconciliation":
        bank = message.get("bank", "HSBC")
        options = message.get("options", {})
        return run_reconciliation(bank, options)

    else:
        return {
            "success": False,
            "error": f"Unknown command: {command}",
            "errorCode": "UNKNOWN_COMMAND",
            "supportedCommands": ["ping", "run_reconciliation"],
            "timestamp": datetime.now().isoformat()
        }


# === MAIN ENTRY POINT ===

def main():
    """
    Main entry point - read message, process, respond.

    This script is invoked by Chrome's native messaging system.
    It reads one message from stdin, processes it, writes response to stdout, then exits.
    """
    try:
        message = read_message()
        if message is None:
            # stdin closed - normal termination
            sys.exit(0)

        response = handle_command(message)
        send_message(response)

    except json.JSONDecodeError as e:
        send_error(f"Invalid JSON input: {e}", "INVALID_JSON")
        sys.exit(1)
    except Exception as e:
        send_error(f"Fatal error: {e}", "FATAL_ERROR")
        sys.exit(1)


if __name__ == "__main__":
    main()
