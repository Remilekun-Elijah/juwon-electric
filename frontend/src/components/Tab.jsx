/* eslint-disable react/prop-types */
import { Typography } from "@mui/material";

export default function Tab({ navMenu, active, setActive }) {
  return (
    <div className="flex gap-x-5 gap-y-3 flex-wrap lg:justify-start justify-center">
      {navMenu.map((a, i) => {
        return (
          <Typography
            key={i}
            className={`cursor-pointer rounded-lg px-5 py-2 inter-bold md:!text-base !text-sm ${
              active === i && "shadow-lg"
            }`}
            sx={{
              background: active === i ? "#DB464C" : "transparent",
              color: active === i ? "white" : "#DB464C",
              border: active === i && "2px solid white",
            }}
            onClick={() => setActive(i)}
          >
            {a}
          </Typography>
        );
      })}
    </div>
  );
}
