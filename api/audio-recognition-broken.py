"""
Lightweight Audio Recognition Service for Vercel Deployment
Provides basic audio recognition with mock advanced features.
"""

import os
import json
import base64
import random
import time
from typing import Dict, List, Optional, Any
from http.server import BaseHTTPRequestHandler
import urllib.parse

# Configuration
AUDD_API_KEY = os.getenv("AUDD_API_KEY", "")

# Major scale compatibility mapping
MAJOR_SCALES = {
    "C": ["C", "D", "E", "F", "G", "A", "B"],
    "G": ["G", "A", "B", "C", "D", "E", "F#"],
    "D": ["D", "E", "F#", "G", "A", "B", "C#"],
    "A": ["A", "B", "C#", "D", "E", "F#", "G#"],
    "E": ["E", "F#", "G#", "A", "B", "C#", "D#"],
    "B": ["B", "C#", "D#", "E", "F#", "G#", "A#"],
    "F": ["F", "G", "A", "A#", "C", "D", "E"],
}

class LightAudioRecognitionService:
    def __init__(self):
        pass

    def generate_mock_features(self) -> Dict[str, Any]:
        """Generate realistic mock audio features"""
        keys = list(MAJOR_SCALES.keys())
        genres = ["electronic", "house", "techno", "progressive", "trance", "deep house"]

        return {
            "bpm": round(120 + random.uniform(-20, 40), 1),
            "key": random.choice(keys),
            "genre": random.choice(genres),
            "energy": round(random.uniform(0.3, 0.9), 2),
            "mfcc_features": [round(random.uniform(-50, 50), 2) for _ in range(13)],
            "spectral_centroid": round(2000 + random.uniform(-500, 1500), 1),
            "confidence": round(random.uniform(0.7, 0.95), 2),
            "valence": round(random.uniform(0.2, 0.8), 2),
            "danceability": round(random.uniform(0.5, 0.95), 2),
        }

    def check_key_compatibility(self, key1: str, key2: str) -> Dict[str, Any]:
        """Check harmonic compatibility between two keys"""
        if key1 not in MAJOR_SCALES or key2 not in MAJOR_SCALES:
            return {
                "compatible": False,
                "score": 0.0,
                "shared_notes": 0,
                "reason": "Unknown key"
            }

        scale1 = set(MAJOR_SCALES[key1])
        scale2 = set(MAJOR_SCALES[key2])
        shared_notes = len(scale1.intersection(scale2))

        return {
            "compatible": shared_notes >= 5,
            "score": round(shared_notes / 7.0, 2),
            "shared_notes": shared_notes,
            "reason": f"Shares {shared_notes}/7 notes"
        }

    def process_audio_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process audio recognition request"""
        action = request_data.get("action", "recognize")

        if action == "recognize":
            # Mock recognition response
            features = self.generate_mock_features()

            return {
                "recognition": None,  # No actual track recognition in light mode
                "features": features,
                "suggestions": [],
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                "service_mode": "lightweight"
            }

        elif action == "compatibility":
            key1 = request_data.get("key1", "C")
            key2 = request_data.get("key2", "G")
            return self.check_key_compatibility(key1, key2)

        else:
            return {"error": "Unknown action"}

# Vercel handler
class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))

            service = LightAudioRecognitionService()
            response = service.process_audio_request(request_data)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            response_json = json.dumps(response)
            self.wfile.write(response_json.encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()

            error_response = {
                "error": str(e),
                "service_mode": "lightweight"
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()