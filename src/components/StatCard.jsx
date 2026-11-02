export default function StatCard({ title, value, valueColor, sub, gradient, icon, last }) {
  return (
    <div className={`w-full max-w-full px-3 sm:w-1/2 sm:flex-none xl:w-1/4 ${last ? "" : "mb-6 xl:mb-0"}`}>
      <div className="relative flex flex-col min-w-0 break-words bg-white shadow-xl dark:bg-slate-850 dark:shadow-dark-xl rounded-2xl bg-clip-border">
        <div className="flex-auto p-4">
          <div className="flex flex-row -mx-3">
            <div className="flex-none w-2/3 max-w-full px-3">
              <p className="mb-0 font-sans text-sm font-semibold leading-normal uppercase dark:text-white dark:opacity-60">{title}</p>
              <h5 className="mb-2 font-bold dark:text-white" style={valueColor ? { color: valueColor } : undefined}>{value}</h5>
              <p className="mb-0 dark:text-white dark:opacity-60">{sub}</p>
            </div>
            <div className="px-3 text-right basis-1/3">
              <div className={`inline-block w-12 h-12 text-center rounded-circle bg-gradient-to-tl ${gradient}`}>
                <i className={`ni leading-none ${icon} text-lg relative top-3.5 text-white`}></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
