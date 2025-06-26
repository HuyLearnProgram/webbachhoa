import React from "react";

const InputField = ({
  value,
  setValue,
  nameKey,
  type,
  register,
  errors = {},
  validationRules
}) => {
  return (
    <div className="w-full flex flex-col relative">
      {value.trim() !== '' && (
        <label
          className="text-[15px] absolute top-[-2px] left-4 block bg-white animate-slide-top-sm"
          htmlFor={nameKey}
        >
          {nameKey?.slice(0, 1).toUpperCase() + nameKey?.slice(1)}
        </label>
      )}

      <input
        type={type || "text"}
        className={`w-full border px-4 py-2 my-2 rounded-sm placeholder:text-sm outline-none ${errors[nameKey] ? 'border-red-500' : ''}`}
        placeholder={nameKey?.slice(0, 1).toUpperCase() + nameKey?.slice(1)}
        value={value}
        {...register(nameKey, validationRules)}
        onChange={(e) => setValue((prev) => ({ ...prev, [nameKey]: e.target.value }))}
      />
      {errors[nameKey] && <span className="text-red-500 text-sm">{errors[nameKey].message}</span>}
    </div>
  );
};

export default InputField;
