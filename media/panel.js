;(function () {
    const statusEl = document.getElementById('status')
    const outEl = document.getElementById('out')

    statusEl.textContent = 'Ready — press the shortcut to send selection'

    window.addEventListener('message', (e) => {
        const msg = e.data || {}
        if (msg.type === 'hello') {
            statusEl.textContent = 'Hello received'
            return
        }
        if (msg.type === 'render') {
            statusEl.textContent = 'Render message received ✅'
            const jsx = (msg.payload && msg.payload.jsx) || '(no payload)'
            outEl.textContent = jsx
        }
    })
})()
