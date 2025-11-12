// 테스트 환경에서의 global 타입 확장

declare global {
  namespace NodeJS {
    interface Global {
      SpeechSynthesisUtterance: any;
      speechSynthesis: any;
    }
  }
  
  var SpeechSynthesisUtterance: any;
  var speechSynthesis: any;
}

export {};