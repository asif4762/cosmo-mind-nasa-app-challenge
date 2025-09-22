import { useEffect, useState } from "react";
import { buildTerraBookData } from "../utils/terra-data-to-book";

export default function useTerraBookData() {
  const [bookData, setBookData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/datas/MODIS_NDVI_All_Countries_2000_2024.json") // in /public/datas/
      .then(r => r.json())
      .then(json => setBookData(buildTerraBookData(json)))
      .catch(setError);
  }, []);

  return { bookData, error };
}
