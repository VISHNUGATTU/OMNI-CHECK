export default function Forms() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-xl font-semibold text-slate-800">Candidate intake</h3>
      <form className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Full name</label>
          <input
            type="text"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Role</label>
          <input
            type="text"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400"
            placeholder="Product Analyst"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Save profile
        </button>
      </form>
    </div>
  );
}
