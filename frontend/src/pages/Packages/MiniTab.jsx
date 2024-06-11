// eslint-disable-next-line react/prop-types
const MiniTab = ({ active, setActive, data = [] }) => {
  return (
    <div className="inline-flex gap-2 bg-white rounded-md p-2">
      {data.map((a, i) => (
        <p
          onClick={() => setActive(i)}
          key={i}
          className={`py-2 rounded-md cursor-pointer inter-medium px-3 ${
            active === i ? "bg-red text-white shadow-lg" : "bg-white text-black"
          }`}
        >
          {a}
        </p>
      ))}
    </div>
  );
};

export default MiniTab;
