import React, { useEffect, useState } from "react";
import HomeBackground from "assets/Image/home-background.png";
import FigureMan from "assets/Image/figure-man.gif";
import FigureWomen from "assets/Image/figure-women.gif";
import { useNavigate } from "react-router-dom";

const warningText = "Chơi quá 180 phút sẽ ảnh hưởng xấu tới sức khỏe";

const Home = () => {
  const [active, setActive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => {
      setActive(true);
    }, 300);
  }, []);

  return (
    <div className="container">
      <div className="shine-effect">
        <img
          src={HomeBackground}
          alt="Home Background"
        />
      </div>
      <div className="figure">
        <div className="figure-man">
          <img src={FigureMan} alt="" />
        </div>

        <div className="figure-women">
          <img src={FigureWomen} alt="" />
        </div>

      </div>
      <div className="text-info">
        <h3 className={`blink-text ${active ? "blink-text-animation" : ""}`}>
          {warningText.split("").map((char, index) => (
            <span
              key={index}
              style={{
                animationDelay: `${0.05 * index}s`
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h3>
      </div>
      <button onClick={() => navigate("/game")} className="start-game">START GAME</button>
    </div>
  );
};

export default Home;