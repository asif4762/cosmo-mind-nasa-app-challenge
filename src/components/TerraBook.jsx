import React, { useMemo, useEffect } from "react";
import HTMLFlipBook from "react-pageflip";
import "./terra-book.css";
import confetti from 'canvas-confetti';
import { Howl } from 'howler';

const flipSound = new Howl({ src: ['/sounds/page-flip.mp3'], volume: 0.25 });
const chime = new Howl({ src: ['/sounds/chime.mp3'], volume: 0.3 });

// Narration function
const narrate = (text) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = speechSynthesis.getVoices().find(voice => voice.lang === 'en-US');
  utterance.pitch = 1; // Adjust the pitch for a natural sound
  utterance.rate = 1; // Adjust speed of the narration
  speechSynthesis.speak(utterance);
};

const Page = React.forwardRef(({ children, className = "" }, ref) => (
  <div className={`page ${className}`} ref={ref}>
    <div className="page-content">{children}</div>
  </div>
));

const Cover = ({ title, subtitle }) => {
  useEffect(() => {
    narrate(title); // Narrate title when cover is loaded
    if (subtitle) narrate(subtitle); // Narrate subtitle if available
  }, [title, subtitle]);

  return (
    <div className="cover-simple">
      <h1 className="cover-title">{title}</h1>
      {subtitle ? <p className="cover-subtitle">{subtitle}</p> : null}
    </div>
  );
};

const CountryIntro = ({ country }) => {
  useEffect(() => {
    narrate(country.name); // Narrate country name when country intro is loaded
    narrate(`Let’s fly over ${country.name} with Terra. The greener it is, the better plants are doing.`);
  }, [country]);

  return (
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
};

const YearPage = ({ name, year, image, caption, story }) => {
  useEffect(() => {
    narrate(`${name} Year ${year}`); // Narrate country year page
    if (story) narrate(story); // Narrate the story text
  }, [name, year, story]);

  return (
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
};

export default function TerraBook({ title, subtitle, data }) {
  const countries = data?.countries ?? [];

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
        const total = pages.length;
        const curr = e.data; // current page index
        if (total - curr <= 2) {
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
  );
}
