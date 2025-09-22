import React from "react";
import TerraBook from "../components/TerraBook";
import bookDataKEN from "../data/terraBookData_ken";
import "../components/terra-book.css";

export default function Book() {
  return (
    <div className="bg-[#0e1a26] min-h-screen">
      <div className="w-full h-screen flex items-center justify-center">
        <TerraBook
          title={bookDataKEN.title}
          subtitle={bookDataKEN.subtitle}
          data={{ countries: bookDataKEN.countries }}
        />
      </div>
    </div>
  );
}
