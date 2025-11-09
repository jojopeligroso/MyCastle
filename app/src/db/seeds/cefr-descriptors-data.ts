/**
 * CEFR 2018 Descriptors Data
 * Source: Council of Europe - Common European Framework of Reference for Languages
 * https://www.coe.int/en/web/common-european-framework-reference-languages
 *
 * T-034: Seed CEFR Descriptors
 */

export interface CEFRDescriptor {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  category: string;
  subcategory: string;
  descriptor_text: string;
  metadata?: Record<string, unknown>;
}

export const cefrDescriptorsData: CEFRDescriptor[] = [
  // ========================================
  // LISTENING COMPREHENSION
  // ========================================
  {
    level: 'A1',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Can follow speech which is very slow and carefully articulated, with long pauses for them to assimilate meaning.',
    metadata: { domain: 'reception', skill: 'listening' },
  },
  {
    level: 'A2',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Can understand phrases and expressions related to areas of most immediate priority (e.g. very basic personal and family information, shopping, local geography, employment) provided speech is clearly and slowly articulated.',
    metadata: { domain: 'reception', skill: 'listening' },
  },
  {
    level: 'B1',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Can understand straightforward factual information about common everyday or job-related topics, identifying both general messages and specific details, provided speech is clearly articulated in a generally familiar accent.',
    metadata: { domain: 'reception', skill: 'listening' },
  },
  {
    level: 'B2',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Can understand standard spoken language, live or broadcast, on both familiar and unfamiliar topics normally encountered in personal, social, academic or vocational life. Only extreme background noise, inadequate discourse structure and/or idiomatic usage influences the ability to understand.',
    metadata: { domain: 'reception', skill: 'listening' },
  },
  {
    level: 'C1',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Can understand enough to follow extended speech on abstract and complex topics beyond their own field, though they may need to confirm occasional details, especially if the accent is unfamiliar.',
    metadata: { domain: 'reception', skill: 'listening' },
  },
  {
    level: 'C2',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Has no difficulty in understanding any kind of spoken language, whether live or broadcast, delivered at fast native speed.',
    metadata: { domain: 'reception', skill: 'listening' },
  },

  // ========================================
  // READING COMPREHENSION
  // ========================================
  {
    level: 'A1',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can understand very short, simple texts a single phrase at a time, picking up familiar names, words and basic phrases and rereading as required.',
    metadata: { domain: 'reception', skill: 'reading' },
  },
  {
    level: 'A2',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can understand short, simple texts on familiar matters of a concrete type which consist of high frequency everyday or job-related language.',
    metadata: { domain: 'reception', skill: 'reading' },
  },
  {
    level: 'B1',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can read straightforward factual texts on subjects related to their field of interest with a satisfactory level of comprehension.',
    metadata: { domain: 'reception', skill: 'reading' },
  },
  {
    level: 'B2',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can read with a large degree of independence, adapting style and speed of reading to different texts and purposes, and using appropriate reference sources selectively. Has a broad active reading vocabulary, but may experience some difficulty with low-frequency idioms.',
    metadata: { domain: 'reception', skill: 'reading' },
  },
  {
    level: 'C1',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can understand in detail lengthy, complex texts, whether or not they relate to their own area of speciality, provided they can reread difficult sections.',
    metadata: { domain: 'reception', skill: 'reading' },
  },
  {
    level: 'C2',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can understand and interpret critically virtually all forms of the written language including abstract, structurally complex, or highly colloquial literary and non-literary writings.',
    metadata: { domain: 'reception', skill: 'reading' },
  },

  // ========================================
  // SPOKEN INTERACTION
  // ========================================
  {
    level: 'A1',
    category: 'Spoken Interaction',
    subcategory: 'Overall spoken interaction',
    descriptor_text: 'Can interact in a simple way but communication is totally dependent on repetition at a slower rate, rephrasing and repair. Can ask and answer simple questions, initiate and respond to simple statements in areas of immediate need or on very familiar topics.',
    metadata: { domain: 'interaction', skill: 'speaking' },
  },
  {
    level: 'A2',
    category: 'Spoken Interaction',
    subcategory: 'Overall spoken interaction',
    descriptor_text: 'Can interact with reasonable ease in structured situations and short conversations, provided the other person is prepared to repeat or rephrase things at a slower rate of speech and help them to formulate what they are trying to say. Can make simple exchanges without undue effort; can ask and answer questions and exchange ideas and information on familiar topics in predictable everyday situations.',
    metadata: { domain: 'interaction', skill: 'speaking' },
  },
  {
    level: 'B1',
    category: 'Spoken Interaction',
    subcategory: 'Overall spoken interaction',
    descriptor_text: 'Can communicate with some confidence on familiar routine and non-routine matters related to their interests and professional field. Can exchange, check and confirm information, deal with less routine situations and explain why something is a problem. Can express thoughts on more abstract, cultural topics such as films, books, music etc.',
    metadata: { domain: 'interaction', skill: 'speaking' },
  },
  {
    level: 'B2',
    category: 'Spoken Interaction',
    subcategory: 'Overall spoken interaction',
    descriptor_text: 'Can use the language fluently, accurately and effectively on a wide range of general, academic, vocational or leisure topics, marking clearly the relationships between ideas. Can communicate spontaneously with good grammatical control without much sign of having to restrict what they want to say, adopting a level of formality appropriate to the circumstances.',
    metadata: { domain: 'interaction', skill: 'speaking' },
  },
  {
    level: 'C1',
    category: 'Spoken Interaction',
    subcategory: 'Overall spoken interaction',
    descriptor_text: 'Can express themselves fluently and spontaneously, almost effortlessly. Has a good command of a broad lexical repertoire allowing gaps to be readily overcome with circumlocutions. There is little obvious searching for expressions or avoidance strategies; only a conceptually difficult subject can hinder a natural, smooth flow of language.',
    metadata: { domain: 'interaction', skill: 'speaking' },
  },
  {
    level: 'C2',
    category: 'Spoken Interaction',
    subcategory: 'Overall spoken interaction',
    descriptor_text: 'Has a good command of idiomatic expressions and colloquialisms with awareness of connotative level of meaning. Can convey finer shades of meaning precisely by using, with reasonable accuracy, a wide range of modification devices. Can backtrack and restructure around a difficulty so smoothly the interlocutor is hardly aware of it.',
    metadata: { domain: 'interaction', skill: 'speaking' },
  },

  // ========================================
  // SPOKEN PRODUCTION
  // ========================================
  {
    level: 'A1',
    category: 'Spoken Production',
    subcategory: 'Overall spoken production',
    descriptor_text: 'Can produce simple mainly isolated phrases about people and places.',
    metadata: { domain: 'production', skill: 'speaking' },
  },
  {
    level: 'A2',
    category: 'Spoken Production',
    subcategory: 'Overall spoken production',
    descriptor_text: 'Can give a simple description or presentation of people, living or working conditions, daily routines, likes/dislikes etc. as a short series of simple phrases and sentences linked into a list.',
    metadata: { domain: 'production', skill: 'speaking' },
  },
  {
    level: 'B1',
    category: 'Spoken Production',
    subcategory: 'Overall spoken production',
    descriptor_text: 'Can reasonably fluently sustain a straightforward description of one of a variety of subjects within their field of interest, presenting it as a linear sequence of points.',
    metadata: { domain: 'production', skill: 'speaking' },
  },
  {
    level: 'B2',
    category: 'Spoken Production',
    subcategory: 'Overall spoken production',
    descriptor_text: 'Can give clear, systematically developed descriptions and presentations, with appropriate highlighting of significant points, and relevant supporting detail.',
    metadata: { domain: 'production', skill: 'speaking' },
  },
  {
    level: 'C1',
    category: 'Spoken Production',
    subcategory: 'Overall spoken production',
    descriptor_text: 'Can give clear, detailed descriptions and presentations on complex subjects, integrating sub-themes, developing particular points and rounding off with an appropriate conclusion.',
    metadata: { domain: 'production', skill: 'speaking' },
  },
  {
    level: 'C2',
    category: 'Spoken Production',
    subcategory: 'Overall spoken production',
    descriptor_text: 'Can produce clear, smoothly flowing, well-structured speech with an effective logical structure which helps the recipient to notice and remember significant points.',
    metadata: { domain: 'production', skill: 'speaking' },
  },

  // ========================================
  // WRITING
  // ========================================
  {
    level: 'A1',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write simple isolated phrases and sentences.',
    metadata: { domain: 'production', skill: 'writing' },
  },
  {
    level: 'A2',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write a series of simple phrases and sentences linked with simple connectors like "and", "but" and "because".',
    metadata: { domain: 'production', skill: 'writing' },
  },
  {
    level: 'B1',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write straightforward connected texts on a range of familiar subjects within their field of interest, by linking a series of shorter discrete elements into a linear sequence.',
    metadata: { domain: 'production', skill: 'writing' },
  },
  {
    level: 'B2',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write clear, detailed texts on a variety of subjects related to their field of interest, synthesising and evaluating information and arguments from a number of sources.',
    metadata: { domain: 'production', skill: 'writing' },
  },
  {
    level: 'C1',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write clear, well-structured texts on complex subjects, underlining the relevant salient issues, expanding and supporting points of view at some length with subsidiary points, reasons and relevant examples, and rounding off with an appropriate conclusion.',
    metadata: { domain: 'production', skill: 'writing' },
  },
  {
    level: 'C2',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write clear, smoothly flowing, complex texts in an appropriate and effective style and a logical structure which helps the reader to find significant points.',
    metadata: { domain: 'production', skill: 'writing' },
  },

  // ========================================
  // VOCABULARY RANGE
  // ========================================
  {
    level: 'A1',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has a basic vocabulary repertoire of isolated words and phrases related to particular concrete situations.',
    metadata: { domain: 'linguistic', skill: 'vocabulary' },
  },
  {
    level: 'A2',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has sufficient vocabulary to conduct routine, everyday transactions involving familiar situations and topics.',
    metadata: { domain: 'linguistic', skill: 'vocabulary' },
  },
  {
    level: 'B1',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has a sufficient vocabulary to express themselves with some circumlocutions on most topics pertinent to their everyday life such as family, hobbies and interests, work, travel, and current events.',
    metadata: { domain: 'linguistic', skill: 'vocabulary' },
  },
  {
    level: 'B2',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has a good range of vocabulary for matters connected to their field and most general topics. Can vary formulation to avoid frequent repetition, but lexical gaps can still cause hesitation and circumlocution.',
    metadata: { domain: 'linguistic', skill: 'vocabulary' },
  },
  {
    level: 'C1',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has a good command of a broad lexical repertoire allowing gaps to be readily overcome with circumlocutions; little obvious searching for expressions or avoidance strategies. Good command of idiomatic expressions and colloquialisms.',
    metadata: { domain: 'linguistic', skill: 'vocabulary' },
  },
  {
    level: 'C2',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has a good command of a very broad lexical repertoire including idiomatic expressions and colloquialisms; shows awareness of connotative levels of meaning.',
    metadata: { domain: 'linguistic', skill: 'vocabulary' },
  },

  // ========================================
  // GRAMMATICAL ACCURACY
  // ========================================
  {
    level: 'A1',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Shows only limited control of a few simple grammatical structures and sentence patterns in a learnt repertoire.',
    metadata: { domain: 'linguistic', skill: 'grammar' },
  },
  {
    level: 'A2',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Uses some simple structures correctly, but still systematically makes basic mistakes – for example tends to mix up tenses and forget to mark agreement; nevertheless, it is usually clear what they are trying to say.',
    metadata: { domain: 'linguistic', skill: 'grammar' },
  },
  {
    level: 'B1',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Uses reasonably accurately a repertoire of frequently used "routines" and patterns associated with more predictable situations.',
    metadata: { domain: 'linguistic', skill: 'grammar' },
  },
  {
    level: 'B2',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Good grammatical control; occasional "slips" or non-systematic errors and minor flaws in sentence structure may still occur, but they are rare and can often be corrected in retrospect.',
    metadata: { domain: 'linguistic', skill: 'grammar' },
  },
  {
    level: 'C1',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Consistently maintains a high degree of grammatical accuracy; errors are rare and difficult to spot.',
    metadata: { domain: 'linguistic', skill: 'grammar' },
  },
  {
    level: 'C2',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Maintains consistent grammatical control of complex language, even while attention is otherwise engaged (e.g. in forward planning, in monitoring others\' reactions).',
    metadata: { domain: 'linguistic', skill: 'grammar' },
  },

  // ========================================
  // COHERENCE AND COHESION
  // ========================================
  {
    level: 'A1',
    category: 'Coherence',
    subcategory: 'Coherence and cohesion',
    descriptor_text: 'Can link words or groups of words with very basic linear connectors like "and" or "then".',
    metadata: { domain: 'pragmatic', skill: 'coherence' },
  },
  {
    level: 'A2',
    category: 'Coherence',
    subcategory: 'Coherence and cohesion',
    descriptor_text: 'Can link groups of words with simple connectors like "and", "but" and "because".',
    metadata: { domain: 'pragmatic', skill: 'coherence' },
  },
  {
    level: 'B1',
    category: 'Coherence',
    subcategory: 'Coherence and cohesion',
    descriptor_text: 'Can link a series of shorter, discrete simple elements into a connected, linear sequence of points.',
    metadata: { domain: 'pragmatic', skill: 'coherence' },
  },
  {
    level: 'B2',
    category: 'Coherence',
    subcategory: 'Coherence and cohesion',
    descriptor_text: 'Can use a variety of linking words efficiently to mark clearly the relationships between ideas.',
    metadata: { domain: 'pragmatic', skill: 'coherence' },
  },
  {
    level: 'C1',
    category: 'Coherence',
    subcategory: 'Coherence and cohesion',
    descriptor_text: 'Can produce clear, smoothly flowing, well-structured speech, showing controlled use of organisational patterns, connectors and cohesive devices.',
    metadata: { domain: 'pragmatic', skill: 'coherence' },
  },
  {
    level: 'C2',
    category: 'Coherence',
    subcategory: 'Coherence and cohesion',
    descriptor_text: 'Can create coherent and cohesive text making full and appropriate use of a variety of organisational patterns and a wide range of connectors and other cohesive devices.',
    metadata: { domain: 'pragmatic', skill: 'coherence' },
  },
];
