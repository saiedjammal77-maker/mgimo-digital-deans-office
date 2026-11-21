import type {ReactNode} from "react";
const sketches:Record<string,ReactNode>={
  schedule:<><path d="m40 46 88-24 44 24-87 25Z M40 46l-2 79 47 28 1-82 86-25-4 79-83 28 M41 121l46 25 79-24 M86 87l81-24"/>{[0,1,2,3].map(n=><path key={n} d={`M${97+n*19} ${46-n*5}q-9-21 0-22 8-1 7 12`}/>)}{[0,1,2].map(n=><path key={n} d={`M96 ${98+n*14}l58-17m-45-4-1 48m19-54-1 49m18-54-1 49`}/>)}<path d="m48 58-4 63 31 16 4-62Z" strokeDasharray="2 4"/></>,
  grades:<><path d="m19 108 61-23 38 9 58-30 14 12-73 43-37-14-56 21Z M24 126v7l56-21 38 15 73-44v-7 M50 88V56l14-7 14 6v27m-28-26 14 6 14-7m-14 7v24 M84 82V37l14-7 14 7v50m-28-50 14 7 14-7m-14 7v40 M120 81V20l15-7 14 7v47m-29-47 15 7 14-7m-14 7v49"/><path d="m29 146 52-22 37 14 66-38" strokeDasharray="3 4"/></>,
  applications:<><path d="m28 106 94-51 66 34-95 55Z M28 106l1 6 64 38 95-56v-5 M40 91l87-47 48 26-87 48Z M52 70l74-40 46 23-77 43Z M87 63l31-17m-25 22 37-20m-30 24 20-10"/><path d="M132 80c-2-17 22-27 27-13s-15 32-24 22m1-17c7-11 19-13 19-4s-8 15-15 15m-1 7-4 17 10-7 7 2 2-17"/><path d="m34 116 57 32 89-50" strokeDasharray="1 4"/></>,
  notifications:<><path d="M48 115c-7-13 12-21 12-42 0-23 6-42 32-48 28-7 44 5 53 33 6 17 25 22 26 36 1 21-109 46-123 21Z M48 112c5 16 96 3 121-23 M91 127c3 17 28 12 31-6 M97 24c-4-16 13-19 16-2 M84 35c-12 6-16 23-17 44"/><path d="M41 50c-9 12-12 24-10 36m14-23-3 13m110-52c9 4 15 15 18 25m-10-9-4-6" strokeDasharray="5 4"/></>,
  profile:<><path d="m24 61 109-34 52 33-111 39Z M24 61l1 74 50 28 110-38V60 M74 99l1 64 M34 76l28 18v44l-28-15Z"/><ellipse cx="48" cy="102" rx="5" ry="8" transform="rotate(-18 48 102)"/><path d="m38 116 4-5 9 5 6 14 M87 107l79-26m-79 37 61-20m-61 31 35-12m-35 22 48-16"/><circle cx="157" cy="115" r="9"/><path d="m153 115 3 3 6-8"/></>
};
export default function Engraving({type}:{type:string}){
  return <svg viewBox="0 0 210 170" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"><g opacity=".35" strokeWidth=".55"><path d="m10 132 127-44 61 26M12 142l131-45 55 25M22 148l123-43 42 21M40 156l115-42M31 118l93 40m-74-47 92 40m-72-47 92 40" strokeDasharray="2 4"/></g>{sketches[type]}</svg>
}
