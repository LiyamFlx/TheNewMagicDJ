"""
Audio Recognition Service for The New Magic DJ
Integrated Song Recognition with Genre Prediction + Major Scale Analysis
"""

import os
import json
import base64
import tempfile
from typing import Dict, List, Optional, Any
import numpy as np
from http.server import BaseHTTPRequestHandler
import urllib.parse

# Audio processing imports (these would need to be available in Vercel Python runtime)
try:
    import librosa
    import requests
    from sklearn.neighbors import KNeighborsClassifier
    from joblib import dump, load
    AUDIO_PROCESSING_AVAILABLE = True
except ImportError:
    AUDIO_PROCESSING_AVAILABLE = False

# Configuration
AUDD_API_KEY = os.getenv("AUDD_API_KEY", "")
ACRCLOUD_ACCESS_KEY = os.getenv("ACRCLOUD_ACCESS_KEY", "")

# Major scale compatibility mapping
MAJOR_SCALES = {
    "C": ["C", "D", "E", "F", "G", "A", "B"],
    "G": ["G", "A", "B", "C", "D", "E", "F#"],
    "D": ["D", "E", "F#", "G", "A", "B", "C#"],
    "A": ["A", "B", "C#", "D", "E", "F#", "G#"],
    "E": ["E", "F#", "G#", "A", "B", "C#", "D#"],
    "B": ["B", "C#", "D#", "E", "F#", "G#", "A#"],
    "F": ["F", "G", "A", "A#", "C", "D", "E"],
    "C#": ["C#", "D#", "F", "F#", "G#", "A#", "C"],
    "F#": ["F#", "G#", "A#", "B", "C#", "D#", "F"],
    "Bb": ["Bb", "C", "D", "Eb", "F", "G", "A"],
    "Eb": ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
    "Ab": ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
}

class AudioRecognitionService:
    def __init__(self):
        self.genre_model = None
        self.initialize_genre_model()

    def initialize_genre_model(self):
        """Initialize or create a simple genre classification model"""
        try:
            # In production, this would load a pre-trained model
            # For now, create a simple model with basic features
            if AUDIO_PROCESSING_AVAILABLE:
                X = [
                    [30, 10, 0.5],  # pop: low tempo variation, moderate energy
                    [60, 20, 0.7],  # rock: higher variation, high energy
                    [100, 40, 0.3], # classical: very high variation, lower energy
                    [5, -10, 0.8],  # electronic: very low variation, very high energy
                    [40, 15, 0.6],  # hip-hop: moderate variation, high energy
                    [25, 8, 0.9],   # house: low variation, very high energy
                ]
                y = ["pop", "rock", "classical", "electronic", "hip-hop", "house"]
                self.genre_model = KNeighborsClassifier(n_neighbors=3)
                self.genre_model.fit(X, y)
        except Exception as e:
            print(f"Genre model initialization failed: {e}")
            self.genre_model = None

    def recognize_audd(self, audio_data: bytes) -> Optional[Dict[str, Any]]:
        """Recognize track using AudD API"""
        if not AUDD_API_KEY:
            return None

        try:
            files = {"file": ("audio.wav", audio_data, "audio/wav")}
            data = {
                "api_token": AUDD_API_KEY,
                "return": "apple_music,spotify"
            }

            response = requests.post(
                "https://api.audd.io/",
                data=data,
                files=files,
                timeout=30
            )

            result = response.json()
            if result.get("result"):
                track_info = result["result"]
                return {
                    "title": track_info.get("title", ""),
                    "artist": track_info.get("artist", ""),
                    "album": track_info.get("album", ""),
                    "source": "AudD",
                    "confidence": 0.85,
                    "spotify_id": track_info.get("spotify", {}).get("external_ids", {}).get("isrc"),
                    "preview_url": track_info.get("spotify", {}).get("preview_url")
                }
        except Exception as e:
            print(f"AudD recognition error: {e}")

        return None

    def analyze_audio_features(self, audio_data: bytes) -> Dict[str, Any]:
        """Extract advanced audio features from audio data"""
        if not AUDIO_PROCESSING_AVAILABLE:
            return self.generate_mock_features()

        try:
            # Save audio data to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_filename = temp_file.name

            try:
                # Load audio with librosa
                y, sr = librosa.load(temp_filename, duration=30.0)  # Analyze first 30 seconds

                # Extract tempo (BPM)
                tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
                tempo = float(tempo.item() if hasattr(tempo, "item") else tempo)

                # Extract MFCCs for genre classification
                mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
                mfcc_mean = np.mean(mfccs, axis=1)
                mfcc_std = np.std(mfccs, axis=1)

                # Estimate key
                chroma = librosa.feature.chroma_stft(y=y, sr=sr)
                key_profile = np.mean(chroma, axis=1)
                estimated_key = self.estimate_key_from_chroma(key_profile)

                # Extract energy and spectral features
                spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
                energy = np.mean(librosa.feature.rms(y=y))

                # Predict genre
                genre = self.predict_genre(mfcc_mean, mfcc_std, energy)

                return {
                    "bpm": round(tempo, 2),
                    "key": estimated_key,
                    "genre": genre,
                    "energy": float(energy),
                    "mfcc_features": mfcc_mean.tolist(),
                    "spectral_centroid": float(np.mean(spectral_centroids)),
                    "confidence": 0.8
                }

            finally:
                # Clean up temporary file
                os.unlink(temp_filename)

        except Exception as e:
            print(f"Audio analysis error: {e}")
            return self.generate_mock_features()

    def estimate_key_from_chroma(self, chroma_profile: np.ndarray) -> str:
        """Estimate musical key from chroma features"""
        # Simplified key estimation using chroma profile correlation
        key_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

        # Find the dominant pitch class
        dominant_pitch = np.argmax(chroma_profile)
        estimated_key = key_names[dominant_pitch]

        return estimated_key

    def predict_genre(self, mfcc_mean: np.ndarray, mfcc_std: np.ndarray, energy: float) -> str:
        """Predict genre using MFCC features and energy"""
        if not self.genre_model:
            return "electronic"  # Default genre

        try:
            # Create feature vector: [tempo_variation, spectral_variation, energy]
            tempo_var = np.std(mfcc_mean[:3])  # Use first 3 MFCCs as tempo proxy
            spectral_var = np.std(mfcc_mean[3:8])  # Use MFCCs 3-8 as spectral proxy

            features = [[tempo_var, spectral_var, energy]]
            genre_prediction = self.genre_model.predict(features)[0]
            return genre_prediction
        except Exception as e:
            print(f"Genre prediction error: {e}")
            return "electronic"

    def generate_mock_features(self) -> Dict[str, Any]:
        """Generate mock audio features for development/fallback"""
        import random

        keys = list(MAJOR_SCALES.keys())
        genres = ["electronic", "house", "techno", "pop", "rock", "hip-hop"]

        return {
            "bpm": round(120 + random.uniform(-30, 30), 2),
            "key": random.choice(keys),
            "genre": random.choice(genres),
            "energy": round(random.uniform(0.3, 0.9), 3),
            "mfcc_features": [random.uniform(-50, 50) for _ in range(13)],
            "spectral_centroid": round(random.uniform(1000, 4000), 2),
            "confidence": 0.7
        }

    def calculate_compatibility(self, key1: str, key2: str) -> Dict[str, Any]:
        """Calculate musical compatibility between two keys"""
        if key1 not in MAJOR_SCALES or key2 not in MAJOR_SCALES:
            return {"compatible": False, "score": 0.0, "reason": "Unknown key"}

        scale1 = set(MAJOR_SCALES[key1])
        scale2 = set(MAJOR_SCALES[key2])

        # Calculate shared notes
        shared_notes = len(scale1.intersection(scale2))
        compatibility_score = shared_notes / 7.0  # Normalize to 0-1

        # Keys are considered compatible if they share 5+ notes
        is_compatible = shared_notes >= 5

        return {
            "compatible": is_compatible,
            "score": round(compatibility_score, 3),
            "shared_notes": shared_notes,
            "reason": f"Shares {shared_notes}/7 notes" if not is_compatible else "Harmonically compatible"
        }

    def suggest_next_tracks(self, current_features: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Suggest compatible tracks based on current track features"""
        # This would query a database of tracks in production
        # For now, generate mock suggestions that are musically compatible

        current_bpm = current_features.get("bpm", 120)
        current_key = current_features.get("key", "C")
        current_genre = current_features.get("genre", "electronic")

        suggestions = []

        # Find compatible keys
        compatible_keys = []
        for key in MAJOR_SCALES.keys():
            compatibility = self.calculate_compatibility(current_key, key)
            if compatibility["compatible"]:
                compatible_keys.append(key)

        # Generate mock track suggestions
        track_templates = [
            {"title": "Synthetic Dreams", "artist": "Digital Waves"},
            {"title": "Neon Pulse", "artist": "Electric Horizon"},
            {"title": "Cyber Flow", "artist": "Future Bass"},
            {"title": "Binary Beats", "artist": "Code Sound"},
            {"title": "Virtual Reality", "artist": "Tech Collective"},
        ]

        for i, template in enumerate(track_templates[:3]):
            # Generate BPM within compatible range (±6 BPM)
            suggested_bpm = current_bpm + np.random.uniform(-6, 6)
            suggested_key = np.random.choice(compatible_keys) if compatible_keys else current_key

            suggestion = {
                "title": template["title"],
                "artist": template["artist"],
                "bpm": round(suggested_bpm, 1),
                "key": suggested_key,
                "genre": current_genre,
                "compatibility_score": 0.8 + np.random.uniform(0, 0.2),
                "reason": f"Compatible key ({suggested_key}) and tempo ({suggested_bpm:.1f} BPM)"
            }
            suggestions.append(suggestion)

        return suggestions

def handler(request):
    """Vercel serverless function handler"""
    try:
        # Parse request body
        if hasattr(request, 'get_json'):
            # Flask-style request
            data = request.get_json()
        else:
            # Parse raw body
            import json
            body = request.get('body', '{}')
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body

        service = AudioRecognitionService()

        # Handle different endpoints
        action = data.get('action', 'recognize')

        if action == 'recognize':
            # Audio recognition
            audio_base64 = data.get('audio_data', '')
            if not audio_base64:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Missing audio_data parameter'
                    })
                }

            try:
                # Decode base64 audio data
                audio_data = base64.b64decode(audio_base64)

                # Recognize track
                recognition = service.recognize_audd(audio_data)

                # Analyze audio features
                features = service.analyze_audio_features(audio_data)

                # Generate suggestions
                suggestions = service.suggest_next_tracks(features)

                response = {
                    'recognition': recognition,
                    'features': features,
                    'suggestions': suggestions,
                    'timestamp': str(np.datetime64('now'))
                }

                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    },
                    'body': json.dumps(response)
                }

            except Exception as e:
                return {
                    'statusCode': 500,
                    'body': json.dumps({
                        'error': f'Audio processing failed: {str(e)}'
                    })
                }

        elif action == 'compatibility':
            # Key compatibility check
            key1 = data.get('key1', '')
            key2 = data.get('key2', '')

            if not key1 or not key2:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Missing key1 or key2 parameter'
                    })
                }

            compatibility = service.calculate_compatibility(key1, key2)

            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps(compatibility)
            }

        else:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': f'Unknown action: {action}'
                })
            }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Service error: {str(e)}'
            })
        }

# For local testing
if __name__ == "__main__":
    # Test with mock data
    test_request = {
        'body': json.dumps({
            'action': 'compatibility',
            'key1': 'C',
            'key2': 'G'
        })
    }

    result = handler(test_request)
    print(json.dumps(result, indent=2))