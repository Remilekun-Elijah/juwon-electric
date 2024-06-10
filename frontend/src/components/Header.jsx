import { Link } from "react-router-dom";

// eslint-disable-next-line react/prop-types
const Header = ({ text }) => {
  return (
    <header className="services mt-16 flex flex-col justify-center items-center md:h-[400px] h-[250px]">
      <h2 className="text-center inter-bold xl:text-6xl lg:text-5xl md:text-4xl text-3xl text-offWhite">
        {text}
      </h2>

      <Link
        to="/"
        className="mt-10 px-20 py-3 sora-bold md:text-xl text-base text-white border-2"
        style={{
          background:
            "radial-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2641), rgba(255, 255, 255, 0))",
          filter: "drop-shadow(5px 10px 4px rgba(0, 0, 0, 0.5))",
          border: `2px solid 
            radial-gradient(rgba(216, 216, 216, 0) rgba(216, 216, 216, 1))
            radial-gradient(rgba(216, 216, 216, 0) rgba(216, 216, 216, 1))
            linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0))
            `,
        }}
      >
        GO HOME
      </Link>
    </header>
  );
};

export default Header;
