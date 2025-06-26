import React from 'react'

function EditUser() {
  return (
    <div>
        return (
  <form onSubmit={handleSubmit} className="space-y-4">
    <div>
      <label className="block">Tên:</label>
      <input
        type="text"
        name="name"
        value={userData.name}
        onChange={handleChange}
        className="border p-2 w-full"
      />
    </div>
    <div>
      <label className="block">Email:</label>
      <input
        type="email"
        name="email"
        value={userData.email}
        onChange={handleChange}
        className="border p-2 w-full"
      />
    </div>
    <div>
      <label className="block">Số điện thoại:</label>
      <input
        type="tel"
        name="phone"
        value={userData.phone || ''}
        onChange={handleChange}
        className="border p-2 w-full"
      />
    </div>
    <div>
      <label className="block">Địa chỉ:</label>
      <input
        type="text"
        name="address"
        value={userData.address || ''}
        onChange={handleChange}
        className="border p-2 w-full"
      />
    </div>
    <div>
      <label className="block">Trạng thái:</label>
      <select
        name="status"
        value={userData.status}
        onChange={handleChange}
        className="border p-2 w-full"
      >
        <option value="1">Hoạt động</option>
        <option value="0">Không hoạt động</option>
      </select>
    </div>
    <button type="submit" className="bg-blue-500 text-white p-2">Lưu</button>
  </form>
);
    </div>
  )
}

export default EditUser