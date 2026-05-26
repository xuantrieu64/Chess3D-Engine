import GameComponent from "./components/GameComponent"
import { Route, Routes } from "react-router-dom"
import Home from "./components/Home"
// import TankGameComponent from "./components/TankGameComponent"

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<GameComponent />} />
      </Routes>
    </>
  )
}

export default App
