import { useEffect, useRef } from "react"
import { Game } from "@/game/Game"

const GameComponent = () => {
    const gameRef = useRef<Game | null>(null)
    const animFrameRef = useRef<number>(0)

    useEffect(() => {
        // Game constructor now does NOT touch DOM — safe to call here
        const game = new Game()
        gameRef.current = game

        // init() sets up scene, camera, lights, board, pieces
        game.init()

        // Animation loop — external to Game, fully owned by React lifecycle
        const loop = () => {
            gameRef.current?.update()
            animFrameRef.current = requestAnimationFrame(loop)
        }
        animFrameRef.current = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(animFrameRef.current)
            gameRef.current?.cleanup()
            gameRef.current = null
        }
    }, [])

    return (
        <div className="w-screen h-screen overflow-hidden relative bg-gray-900">
            <canvas
                id="app"
                className="block w-full h-full outline-none"
            />
            <div className="absolute top-4 left-4 text-white z-10 pointer-events-none select-none">
                <h1 className="text-xl font-bold tracking-wide">Chess 3D</h1>
            </div>
        </div>
    )
}

export default GameComponent
