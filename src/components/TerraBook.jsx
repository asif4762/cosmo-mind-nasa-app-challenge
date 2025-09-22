import React, { useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import "./terra-book.css";
import confetti from "canvas-confetti";
import { Howl } from "howler";
import { Play, Pause } from "lucide-react";

const flipSound = new Howl({ src: ["/sounds/page-flip.mp3"], volume: 0.25 });
const chime = new Howl({ src: ["/sounds/chime.mp3"], volume: 0.3 });

const useNarration = () => {
  const utteranceRef = useRef(null);

  const speak = (text) => {
    stop();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = speechSynthesis.getVoices().find((v) => v.lang === "en-US");
    utterance.pitch = 1;
    utterance.rate = 1;
    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.pause();
  };

  const stop = () => {
    if (speechSynthesis.speaking) speechSynthesis.cancel();
  };

  return { speak, pause, stop };
};

const Page = React.forwardRef(({ children, className = "" }, ref) => (
  <div className={`page ${className}`} ref={ref}>
    <div className="page-content">{children}</div>
  </div>
));

const Cover = ({ title, subtitle }) => (
  <div className="cover-simple">
    <h1 className="cover-title">{title}</h1>
    {subtitle && <p className="cover-subtitle">{subtitle}</p>}
  </div>
);

const CountryIntro = ({ country }) => (
  <div className="country-intro">
    {country.coverImage && (
      <img className="country-cover" src={country.coverImage} alt={`${country.name} cover`} />
    )}
    <h2 className="country-title">{country.name}</h2>
    <p className="country-lead">
      Let’s fly over <b>{country.name}</b> with Terra and look at green places using <b>NDVI</b>.
      Greener means plants are doing great. Paler means plants are having a tough time.
    </p>
  </div>
);

const YearPage = ({ name, year, image, caption, story }) => (
  <div className="year-page">
    <div className="year-head">
      <h3 className="year-country">{name}</h3>
      <div className="year-badge">{year}</div>
    </div>

    {image && (
      <figure className="map-figure">
        <img src={image} alt={`${name} ${year}`} />
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    )}

    {story && <p className="story">{story}</p>}
  </div>
);

export default function TerraBook({ title, subtitle, data }) {
  const countries = data?.countries ?? [];
  const { speak, pause, stop } = useNarration();
  const [currentText, setCurrentText] = useState("");
  const [showControls, setShowControls] = useState(false);

  const pages = useMemo(() => {
    const out = [];
    out.push({ kind: "cover" });

    countries.forEach((c) => {
      out.push({ kind: "country-intro", country: c });
      c.pages?.forEach((p) => out.push({ kind: "year", country: c, page: p }));
    });

    out.push({ kind: "back" });
    if (out.length % 2 !== 0) out.push({ kind: "blank" });
    return out;
  }, [countries]);

  const handlePageText = (page) => {
    switch (page.kind) {
      case "cover":
        setCurrentText("");
        setShowControls(false); 
        break;
      case "country-intro":
        setCurrentText(`Let’s fly over ${page.country.name} with Terra. The greener it is, the better plants are doing.`);
        setShowControls(true);
        break;
      case "year":
        setCurrentText(`${page.country.name} Year ${page.page.year}. ${page.page.story || ""}`);
        setShowControls(true);
        break;
      default:
        setCurrentText("");
        setShowControls(true);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <HTMLFlipBook
        width={420}
        height={560}
        maxShadowOpacity={0.4}
        drawShadow
        showCover
        size="fixed"
        className="terra-book"
        onFlip={(e) => {
          flipSound.play();
          stop();
          const pageIndex = e.data;
          handlePageText(pages[pageIndex]);
          if (pages.length - pageIndex <= 2) {
            chime.play();
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.3 } });
          }
        }}
      >
        {pages.map((p, i) => {
          switch (p.kind) {
            case "cover":
              return (
                <Page className="cover" key={`p-${i}`}>
                  <Cover title={title} subtitle={subtitle} />
                </Page>
              );
            case "country-intro":
              return (
                <Page key={`p-${i}`}>
                  <CountryIntro country={p.country} />
                </Page>
              );
            case "year":
              return (
                <Page key={`p-${i}`}>
                  <YearPage
                    name={p.country.name}
                    year={p.page.year}
                    image={p.page.image}
                    caption={p.page.caption}
                    story={p.page.story}
                  />
                </Page>
              );
            case "back":
              return (
                <Page key={`p-${i}`}>
                  <div className="back">
                    <h2>Thanks for reading!</h2>
                    <p>Data: Terra MODIS NDVI (2000–2024)</p>
                  </div>
                </Page>
              );
            default:
              return <Page key={`p-${i}`} />;
          }
        })}
      </HTMLFlipBook>

      {showControls && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "16px",
            zIndex: 10,
          }}
        >
           

{/* Play button */}
<button
  onClick={() => speak(currentText)}
  style={{
    width: 50,
    height: 50,
    borderRadius: "50%",
    background: "radial-gradient(circle at 30% 30%, #1f75fe, #0b3d91)",
    border: "2px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 0 15px #1f75fe, 0 0 30px #1f75fe55 inset",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    animation: "pulse 2s infinite",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "scale(1.2)";
    e.currentTarget.style.boxShadow = "0 0 25px #1f75fe, 0 0 35px #1f75fe inset";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "0 0 15px #1f75fe, 0 0 30px #1f75fe55 inset";
  }}
>
  <Play color="#fff" size={28} />
</button>

{/* Pause button */}
<button
  onClick={pause}
  style={{
    width: 50,
    height: 50,
    borderRadius: "50%",
    background: "radial-gradient(circle at 30% 30%, #ff5959, #ff2e2e)",
    border: "2px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 0 15px #ff5959, 0 0 30px #ff595955 inset",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    animation: "pulseRed 2s infinite",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "scale(1.2)";
    e.currentTarget.style.boxShadow = "0 0 25px #ff5959, 0 0 35px #ff595955 inset";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "0 0 15px #ff5959, 0 0 30px #ff595955 inset";
  }}
>
  <Pause color="#fff" size={28} />
</button>




        </div>
      )}
    </div>
  );
}
