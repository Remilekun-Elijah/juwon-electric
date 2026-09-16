// eslint-disable-next-line react/prop-types
const Header = ({ text }) => {
  return (
    <header className="mt-0 header-nav overflow-hidden max-h-[900px] lg:h-screen  h-[400px] w-full  relative">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="header-video h-full w-full object-cover md:block hidden"
      >
        <source src="/background_video_desktop.mp4" type="video/mp4" />
      </video>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="header-video h-screen w-screen object-cover md:hidden block"
      >
        <source src="/background_video.mp4" type="video/mp4" />
      </video>
      <div className="header-content flex flex-col justify-center items-center lg:h-screen h-full w-full px-5">
        <h2 className="text-center inter-bold xl:text-6xl lg:text-5xl md:text-4xl text-3xl leading-tight text-offWhite">
          {text}
        </h2>

        <a
          href="/"
          className="mt-10 sm:px-20 px-10 py-3 sora-bold md:text-xl text-base text-white border-2 transition-opacity duration-150 hover:opacity-90"
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
        </a>
      </div>
    </header>
  );
};

export default Header;
