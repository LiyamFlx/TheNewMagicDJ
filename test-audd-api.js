#!/usr/bin/env node

// Test if Audd API is working for audio recognition
const API_TOKEN = '65eda6d85f7f9156f06f9c8593b8f94';

async function testAuddAPI() {
    console.log('🎵 Testing Audd API for audio recognition...');

    try {
        // Test with a known audio URL
        const testAudioUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';

        const formData = new FormData();
        formData.append('api_token', API_TOKEN);
        formData.append('url', testAudioUrl);
        formData.append('return', 'apple_music,spotify');

        const response = await fetch('https://api.audd.io/', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Audd API Response:', JSON.stringify(data, null, 2));

            if (data.status === 'success' && data.result) {
                console.log('🎉 Audio recognition working!');
                console.log(`Track: ${data.result.title} by ${data.result.artist}`);
                return true;
            } else {
                console.log('⚠️ API working but no match found (expected for test audio)');
                return true; // API is working, just no match
            }
        } else {
            console.error('❌ Audd API failed:', response.status, response.statusText);
            return false;
        }

    } catch (error) {
        console.error('💥 Network error:', error.message);
        return false;
    }
}

testAuddAPI().then(success => {
    if (success) {
        console.log('\n🔧 Audd API is functional - can implement real MagicMatch');
    } else {
        console.log('\n💀 Audd API not working - need alternative approach');
    }
});