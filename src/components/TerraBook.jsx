import React, { useMemo, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import "./terra-book.css";
import confetti from 'canvas-confetti';
import { Howl } from 'howler';

const flipSound = new Howl({ src: ['/sounds/page-flip.mp3'], volume: 0.25 });
const chime = new Howl({ src: ['/sounds/chime.mp3'], volume: 0.3 });

// Controlled narration
const useNarration = () => {
  const utteranceRef = useRef(null);

  const speak = (text) => {
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = speechSynthesis.getVoices().find(v => v.lang === 'en-US');
    utterance.pitch = 1;
    utterance.rate = 1;
    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.pause();
  };

  const resume = () => {
    if (speechSynthesis.paused) speechSynthesis.resume();
  };

  const stop = () => {
    if (speechSynthesis.speaking) speechSynthesis.cancel();
  };

  return { speak, pause, resume, stop };
};

const Page = React.forwardRef(({ children, className = "" }, ref) => (
  <div className={`page ${className}`} ref={ref}>
    <div className="page-content">{children}</div>
  </div>
));

const Cover = ({ title, subtitle, narrate }) => (
  <div className="cover-simple">
    <h1 className="cover-title">{title}</h1>
    {subtitle && <p className="cover-subtitle">{subtitle}</p>}
    <div style={{ marginTop: 10 }}>
      <button onClick={() => narrate(`${title}. ${subtitle || ""}`)}>Narrate</button>
    </div>
  </div>
);

const CountryIntro = ({ country, narrate }) => (
  <div className="country-intro">
    {country.coverImage && (
      <img className="country-cover" src={country.coverImage} alt={`${country.name} cover`} />
    )}
    <h2 className="country-title">{country.name}</h2>
    <p className="country-lead">
      Let’s fly over <b>{country.name}</b> with Terra and look at green places using <b>NDVI</b>.
      Greener means plants are doing great. Paler means plants are having a tough time.
    </p>
    <div style={{ marginTop: 10 }}>
      <button onClick={() => narrate(`Let’s fly over ${country.name} with Terra.`)}>Narrate</button>
    </div>
  </div>
);

const YearPage = ({ name, year, image, caption, story, narrate }) => (
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

    <div style={{ marginTop: 10 }}>
      <button onClick={() => narrate(`${name} Year ${year}. ${story || ""}`)}>Narrate</button>
    </div>
  </div>
);

export default function TerraBook({ title, subtitle, data }) {
  const countries = data?.countries ?? [];
  const { speak, pause, resume, stop } = useNarration();

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

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <button onClick={pause}>Pause</button>
        <button onClick={resume}>Resume</button>
        <button onClick={stop}>Stop</button>
      </div>
      <HTMLFlipBook
        width={420}
        height={560}
        maxShadowOpacity={0.4}
        drawShadow
        showCover
        size="fixed"
        className="terra-book"
        onFlip={() => {
          flipSound.play();
          stop(); // stop narration automatically on page flip
        }}
      >
        {pages.map((p, i) => {
          switch (p.kind) {
            case "cover":
              return (
                <Page className="cover" key={`p-${i}`}>
                  <Cover title={title} subtitle={subtitle} narrate={speak} />
                </Page>
              );
            case "country-intro":
              return (
                <Page key={`p-${i}`}>
                  <CountryIntro country={p.country} narrate={speak} />
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
                    narrate={speak}
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
    </div>
  );
}
