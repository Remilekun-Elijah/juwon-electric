// eslint-disable-next-line react/prop-types
const MiniTab = ({ active, setActive, data = [] }) => {
  return (
    <div role="tablist" className="inline-flex gap-2 bg-white rounded-md p-2">
      {data.map((a, i) => (
        <button
          type="button"
          role="tab"
          aria-selected={active === i}
          onClick={() => setActive(i)}
          key={a}
          className={`py-2 min-h-[40px] rounded-md uppercase cursor-pointer inter-medium leading-6 px-3 transition-shadow duration-150 ${
            active === i ? "bg-brand-500 text-white shadow-lg" : "bg-white text-black"
          }`}
        >
          {a}
        </button>
      ))}
    </div>
  );
};

export default MiniTab;
