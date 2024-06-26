import { Link } from "react-router-dom";

// eslint-disable-next-line react/prop-types
const Header = ({ text }) => {
  return (
    <header className="mt-0 header-nav overflow-hidden max-h-[900px] lg:h-screen  h-[400px] w-full  relative">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="header-video h-full  w-full md:block hidden "
      >
        <source
          src="/background_video_desktop.mp4"
          className="md:block hidden"
          type="video/mp4"
        />
      </video>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="header-video  h-screen  w-screen md:hidden block"
      >
        <source src="/background_video.mp4" className="" type="video/mp4" />
      </video>
      <div className="header-content flex flex-col justify-center items-center lg:h-screen h-full w-full">
        <h2 className="text-center inter-bold xl:text-6xl lg:text-5xl md:text-4xl text-3xl text-offWhite">
          {text}
        </h2>

        <Link
          to="/"
          className="mt-10 sm:px-20 px-10 py-3 sora-bold md:text-xl text-base text-white border-2"
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
      </div>
    </header>
  );
};

export default Header;
