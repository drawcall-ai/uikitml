import { Canvas } from "@react-three/fiber";
import { createRoot } from "react-dom/client";
import { HorizonOpsConsole } from "./HorizonOpsConsole.js";
import "./styles.css";

function App() {
  return (
    <Canvas orthographic camera={{ position: [0, 0, 10], zoom: 120, near: 0.1, far: 100 }}>
      <color attach="background" args={["#030712"]} />
      <ambientLight intensity={0.8} />
      <group position={[0, 0, 0]}>
        <HorizonOpsConsole />
      </group>
    </Canvas>
  );
}

const root = document.querySelector("#root");
if (root == null) {
  throw new Error("Missing #root element.");
}

createRoot(root).render(<App />);
