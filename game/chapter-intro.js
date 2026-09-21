export const CHAPTER_INTROS = {
  0: { image: '/assets/intros/chene-maillard.png', text: 'Au Chêne Maillard, Karonux se croit le maître des rues. Mais les temps sont durs… et ici, la loi est impitoyable.' },
  1: { image: '/assets/intros/chateau-etang.png', text: 'Au Château de l’Étang, Kikor peint des jours meilleurs. Le problème, c’est que ses mauvaises idées commencent à sortir du cadre.' },
  2: { image: '/assets/intros/stade-colette-besson.png', text: 'Au stade Colette Besson, Yanu ne joue plus pour gagner. Il joue pour qu’on se souvienne de lui. Ce soir, il nous met la lumière avec ses soirée fluo.' },
};
export const INTRO_REVEAL = 8;
export const INTRO_DURATION = 14;
export const hasChapterIntro = state => state.phase === 'intro' && !!CHAPTER_INTROS[state.chapter] && state.stage === 0 && state.chapterStory === true && !state.practice;
