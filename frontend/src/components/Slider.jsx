import StarIcon from "@mui/icons-material/Star";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { Avatar } from "@mui/material";
// eslint-disable-next-line react/prop-types
const Slider = ({ data = [] }) => {
  return (
    <div>
      <div className="flex flex-wrap gap-10 justify-center my-10">
        {data.map((a) => (
          <div key={a.name} className="xl:max-w-[550px] md:max-w-[500px] w-full flex flex-col">
            {/* flex-1/h-full: cards in the same slide share one height. */}
            <div className="relative flex-1">
              <div className="!bg-offWhite px-5 carousel shadow z-20 h-full">
                <div
                  className="p-5 !mb-0 flex flex-col h-full"
                  style={{ borderLeft: "5px solid #811418" }}
                >
                  <img src="/quote.svg" alt="" width={48} height={48} className="mb-5 !w-12" />

                  <p className="inter-medium text-left text-base leading-relaxed text-faint">
                    {a.message}
                  </p>
                </div>
              </div>
              <div className="arrow-down absolute shadow"></div>
            </div>
            <div className="flex items-center mt-14 sm:ml-10 ml-9 gap-4">
              <Avatar className="!w-16 z-20 !h-16" />
              <div>
                <p>{a.name}</p>
                {Array(5)
                  .fill("")
                  .map((_, i) => {
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
