import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// eslint-disable-next-line react/prop-types
const CustomChip = ({ text, className }) => {
  return (
    <div className={className}>
      <span className="rounded-full  inline-block py-2 px-1 bg-deep_red text-white">
        <span className="bg-offWhite inter-bold rounded-full py-2 px-4 text-deep_red">
          {" "}
          {text}
        </span>
        <KeyboardArrowDownIcon />
      </span>
    </div>
  );
};

export default CustomChip;
