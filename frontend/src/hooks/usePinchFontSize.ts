import { useEffect, useRef } from 'react'

const MIN_FONT_SIZE_PERCENT = 80
const MAX_FONT_SIZE_PERCENT = 150
const DEFAULT_FONT_SIZE_PERCENT = 100

export function usePinchFontSize() {
    const initialDistanceRef = useRef<number | null>(null)
    const initialFontSizeRef = useRef<number>(DEFAULT_FONT_SIZE_PERCENT)

    useEffect(() => {
        // Load saved font size from local storage
        const savedFontSize = localStorage.getItem('app-font-size')
        if (savedFontSize) {
            const parsed = parseFloat(savedFontSize)
            if (!isNaN(parsed)) {
                updateFontSize(parsed)
            }
        } else {
            updateFontSize(DEFAULT_FONT_SIZE_PERCENT)
        }

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                // Calculate initial distance between two fingers
                const touch1 = e.touches[0]
                const touch2 = e.touches[1]
                const dist = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                )
                initialDistanceRef.current = dist

                // Get current font size percentage
                const currentFontSizeStr = document.documentElement.style.fontSize
                let currentPercent = DEFAULT_FONT_SIZE_PERCENT
                if (currentFontSizeStr.endsWith('%')) {
                    currentPercent = parseFloat(currentFontSizeStr)
                }
                initialFontSizeRef.current = currentPercent
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && initialDistanceRef.current !== null) {
                e.preventDefault() // Prevent native page zoom

                const touch1 = e.touches[0]
                const touch2 = e.touches[1]
                const currentDist = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                )

                const scale = currentDist / initialDistanceRef.current
                let newFontSize = initialFontSizeRef.current * scale

                // Clamp values
                if (newFontSize < MIN_FONT_SIZE_PERCENT) newFontSize = MIN_FONT_SIZE_PERCENT
                if (newFontSize > MAX_FONT_SIZE_PERCENT) newFontSize = MAX_FONT_SIZE_PERCENT

                updateFontSize(newFontSize)
            }
        }

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                initialDistanceRef.current = null
                // Save current font size
                const currentFontSize = document.documentElement.style.fontSize
                if (currentFontSize) {
                    localStorage.setItem('app-font-size', parseFloat(currentFontSize).toString())
                }
            }
        }

        document.addEventListener('touchstart', handleTouchStart, { passive: true })
        document.addEventListener('touchmove', handleTouchMove, { passive: false })
        document.addEventListener('touchend', handleTouchEnd)

        return () => {
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
        }
    }, [])

    const updateFontSize = (sizePercent: number) => {
        document.documentElement.style.fontSize = `${sizePercent}%`
    }
}
