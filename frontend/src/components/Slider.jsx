import StarIcon from "@mui/icons-material/Star";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import StarBorderIcon from "@mui/icons-material/StarBorder";
// eslint-disable-next-line react/prop-types
const Slider = ({ data = [] }) => {
  return (
    <div>
      <div className="flex flex-wrap gap-10 justify-center my-10">
        {data.map((a, i) => (
          <div key={i} className="xl:max-w-[550px] md:max-w-[500px] w-full">
            <div className="relative">
              <div className="!bg-offWhite px-5 carousel shadow z-20">
                <div
                  className="p-5 !mb-0 flex flex-col"
                  style={{ borderLeft: "5px solid #811418" }}
                >
                  <img src="/quote.svg" alt="" className="mb-5 !w-12" />

                  <p className="inter-medium text-left text-base text-faint">
                    {a.message}
                  </p>
                </div>
              </div>
              <div className="arrow-down absolute shadow"></div>
            </div>
            <div className="flex items-center mt-14 ml-5 gap-4">
              <img src={a.img} className="!w-20 z-20 !h-full" />
              <div>
                <p>{a.name}</p>
                {Array(5)
                  .fill("")
                  .map((b, i) => {
                    if (a.rating === 4.5 && i + 1 === 5) {
                      return (
                        <StarHalfIcon key={i} className="text-[#EAC157]" />
                      );
                    } else if (a.rating === 4 && i + 1 === 5) {
                      return (
                        <StarBorderIcon key={i} className="text-[#EAC157]" />
                      );
                    } else
                      return <StarIcon key={i} className="text-[#EAC157]" />;
                  })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Slider;
