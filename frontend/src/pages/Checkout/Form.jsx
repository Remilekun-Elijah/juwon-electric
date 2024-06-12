const Form = () => {
  return (
    <div className="mt-5 flex justify-center">
      <form className="order_form gap-5 flex w-full flex-col">
        <p className="inter-regular text-base text-[#0B0B0B] lg:text-left text-center">
          Customer Details
        </p>
        <input
          type="text"
          name="name"
          id="name"
          placeholder="Name"
          className="input border-2 bg-transparent p-3 rounded focus:outline-none block"
        />
        <input
          type="tel"
          name="phoneNumber"
          id="phoneNumber"
          placeholder="Phone Number"
          className="input border-2 bg-transparent p-3 rounded focus:outline-none block"
        />
        <input
          type="email"
          name="email"
          id="email"
          placeholder="Email Address"
          className="input border-2 bg-transparent p-3 rounded focus:outline-none block"
        />

        <textarea
          // rows={5}
          className="resize-none border-2 bg-transparent p-3 rounded focus:outline-none block"
          placeholder="Delivery Address"
          name="message"
          id="message"
        ></textarea>

        {/* <button className="flex gap-5 items-center inter-bold text-lg bg-red text-white py-2 justify-center rounded-md">
          <p>Send</p> <SendIcon />
        </button> */}
      </form>
    </div>
  );
};

export default Form;
