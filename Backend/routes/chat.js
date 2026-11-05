const express = require('express');

const router = express.Router();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';

// @desc    Proxy chatbot requests to OpenRouter
// @route   POST /api/chat
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { messages, temperature, max_tokens } = req.body || {};

        const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: 'OPENROUTER_API_KEY is not configured on the server'
            });
        }

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'A non-empty messages array is required'
            });
        }

        const sanitizedMessages = messages
            .filter((message) => message && typeof message.content === 'string')
            .map((message) => ({
                role: ['system', 'user', 'assistant'].includes(message.role) ? message.role : 'user',
                content: message.content
            }));

        if (sanitizedMessages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid messages were provided'
            });
        }

        const upstreamResponse = await fetch(OPENROUTER_URL, {
            method: 'POST',
            signal: AbortSignal.timeout(120000),
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
                'X-Title': 'Mahdia Blue Green Chatbot'
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages: sanitizedMessages,
                temperature: typeof temperature === 'number' ? temperature : 0.7,
                max_tokens: typeof max_tokens === 'number' ? max_tokens : 400
            })
        });

        const data = await upstreamResponse.json();

        if (!upstreamResponse.ok) {
            return res.status(upstreamResponse.status).json({
                success: false,
                message: data?.error?.message || data?.message || 'OpenRouter request failed',
                error: data?.error || null
            });
        }

        const reply = data?.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(502).json({
                success: false,
                message: 'OpenRouter returned no assistant reply'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                reply,
                model: data.model || DEFAULT_MODEL
            }
        });
    } catch (error) {
        console.error('Error proxying chat request:', error);
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            return res.status(504).json({
                success: false,
                message: 'Le service IA a mis trop longtemps à répondre. Réessayez dans un instant.'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to process chat request'
        });
    }
});

module.exports = router;
