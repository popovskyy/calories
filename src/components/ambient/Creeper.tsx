"use client";

/** Обличчя крипера — 4×4 сітка, темні клітинки за координатами з макета. */
const FACE = [
  false, true, true, false,
  false, true, true, false,
  true, false, false, true,
  true, true, true, true,
];

/** Крипер із CSS-блоків: голова 44×44 + дві ноги 16×26. Без SVG — усе квадратне. */
export function Creeper() {
  return (
    <div className="flex flex-col items-center opacity-85" style={{ animation: "fuse 6s linear infinite" }}>
      <div
        className="grid h-11 w-11 grid-cols-4 grid-rows-4 border-[3px] border-solid"
        style={{
          background: "repeating-linear-gradient(45deg,#5b9c3a 0 7px,#4d8a30 7px 14px)",
          borderTopColor: "#7fc054",
          borderLeftColor: "#7fc054",
          borderBottomColor: "#33601f",
          borderRightColor: "#33601f",
        }}
      >
        {FACE.map((dark, i) => (
          <div key={i} style={dark ? { background: "#101013" } : undefined} />
        ))}
      </div>
      <div className="flex gap-1">
        <Leg />
        <Leg />
      </div>
    </div>
  );
}

function Leg() {
  return (
    <div
      className="h-[26px] w-4 bg-[#4d8a30]"
      style={{ borderLeft: "3px solid #6fae46", borderRight: "3px solid #2e5a1c" }}
    />
  );
}
