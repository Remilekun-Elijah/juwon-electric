import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { Link } from "react-router-dom";
import { Box, Button } from "@mui/material";
import config from "../../utils/config";

const Header = () => {
  return (
    <Box
      component={"header"}
      maxWidth={config.padding.x}
      className="lg:mt-30 px-5 mx-auto"
    >
      <div className="flex gap-16 md:flex-nowrap flex-wrap mt:pt-10 overflow-x-visible">
        <div className="order-1">
          <h1 className="inter-bold md:text-4xl lg:text-5xl xl:text-[64px] text-2xl md:text-left text-center mb-8 text-header_color xl:leading-[90px]">
            We’re here to Give excellent Services
          </h1>

          {/* CURVE IMAGE */}
          <img src="curve_line.svg" alt="curve_line" />

          <p className="inter-medium md:text-lg text-base md:my-8 my-5 md:text-left text-center">
            {" "}
            Let&apos;s lighten your every day life. We believe we can make a
            difference to this world, to this very earth on which we live.
          </p>

          <div className="flex flex-wrap md:justify-start justify-center md:gap-10 gap-2">
            <Button
              LinkComponent={Link}
              to={config.routes.packages}
              style={{ backgroundColor: "#DB464C", color: "white" }}
              className="!rounded-full  !py-3 md:!px-7 !px-5"
              size="large"
            >
              SHOP NOW
            </Button>

            <Button
              className="!text-black md:!text-sm !text-xs"
              LinkComponent={Link}
              to="https://www.tiktok.com/@juwon_electric"
              startIcon={<PlayCircleOutlineIcon />}
            >
              {" "}
              View us on tiktok
            </Button>
          </div>
        </div>

        <div className="flex items-start w-full md:order-1 gap-0 justify-center">
          {/* HEADER IMAGE */}
          <img src="header.svg" alt="" className="w-[80%] md:w-max -mt-5" />
          {/* ROTATING IMAGE */}
          <Link
            className="lg:-ml-28 -ml-12 -mb-12 rotate-infinite lg:w-fit w-[50px]"
            to={config.routes.contact}
          >
            <img src="circular.svg" alt="get in touch" />
          </Link>
        </div>
      </div>
    </Box>
  );
};

export default Header;
