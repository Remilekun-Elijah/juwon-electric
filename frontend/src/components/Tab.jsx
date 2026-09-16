/* eslint-disable react/prop-types */
import { Typography } from "@mui/material";

export default function Tab({ navMenu, active, setActive }) {
  return (
    <div
      role="tablist"
      className="flex gap-x-5 gap-y-3 flex-wrap lg:justify-start justify-center"
    >
      {navMenu.map((a, i) => {
        return (
          <Typography
            key={a}
            component="button"
            type="button"
            role="tab"
            aria-selected={active === i}
            // The active tab has a 2px border; inactive tabs get 2px more padding so the size never jumps.
            className={`cursor-pointer rounded-lg inter-bold md:!text-base !text-sm leading-6 transition-shadow duration-150 ${
              active === i ? "shadow-lg px-5 py-2" : "px-[22px] py-[10px]"
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
