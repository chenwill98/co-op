export default function RainbowCard() {
  return (
    <div className="relative isolate p-[3px] rounded-xl overflow-hidden">
      {/* The animated gradient backdrop */}
      <div
        className="
            absolute inset-0 
            bg-[conic-gradient(from_0deg,_red,_orange,_yellow,_green,_blue,_indigo,_violet,_red)]
            animate-spinGradient
            blur-sm 
            opacity-90
          "
      />

      {/* The actual card, placed on top */}
      <div className="relative rounded-xl bg-base-100 shadow-xl p-10">
        <h1 className="text-xl font-bold">Hello Rainbow!</h1>
        <p>This is an example of an animated gradient “shadow.”</p>
      </div>
    </div>
  );
}
