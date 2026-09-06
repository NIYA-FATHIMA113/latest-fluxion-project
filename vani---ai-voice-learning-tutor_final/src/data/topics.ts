import { TopicOption } from '../types';

export const TOPIC_OPTIONS: TopicOption[] = [
  {
    id: 'fractions',
    title: 'Fractions & Proportions',
    grade: 'Grade 6-8',
    description: 'Understanding parts of a whole, numerators, denominators, and real-world division.',
    initialQuestion: 'Namaste! I am Vani, your learning tutor. Today we are exploring fractions. Imagine you have one delicious fresh pizza to share equally with a friend. How would you divide it, and what fraction would each of you get?',
    starterUtterances: [
      'I would cut it into two equal halves.',
      'One half, which is one over two.',
      'Why does the denominator get bigger when the slices get smaller?',
      'If four friends join, each gets one fourth.',
      'Can you explain what happens if we add one half and one fourth?',
      'Thank you Vani, I understand now! Goodbye.',
    ],
  },
  {
    id: 'linear_equations',
    title: 'Linear Equations in One Variable',
    grade: 'Grade 7-9',
    description: 'Balancing equations, solving for unknown x, and inverse mathematical operations.',
    initialQuestion: 'Namaste! I am Vani. Let us explore linear equations. If I think of a secret number x, double it, and add 4 to get 14, what is the first step you would take to find x?',
    starterUtterances: [
      'I would subtract 4 from both sides of the equation.',
      'Then 2x equals 10, so x is 5.',
      'Why do we have to do the same operation to both sides?',
      'What if x is multiplied by a negative number?',
      'Can you give me another practice puzzle?',
      'Thank you Vani, that was very clear! Goodbye.',
    ],
  },
  {
    id: 'photosynthesis',
    title: 'Photosynthesis & Plant Energy',
    grade: 'Grade 6-8',
    description: 'How green leaves convert sunlight, water, and carbon dioxide into glucose and oxygen.',
    initialQuestion: 'Namaste! Welcome back to Vani Science. When you look at green leaves on a tree in the bright morning sun, what ingredients are the leaves using to prepare food for the plant?',
    starterUtterances: [
      'They use sunlight, water from roots, and carbon dioxide from air.',
      'The green pigment is called chlorophyll.',
      'Does the plant make oxygen for us to breathe?',
      'What happens to plants during the night without sunlight?',
      'Is glucose stored as starch in the stems?',
      'Thank you Vani, I loved this lesson! Goodbye.',
    ],
  },
  {
    id: 'geometry_triangles',
    title: 'Angles & Triangle Properties',
    grade: 'Grade 8-10',
    description: 'Sum of interior angles, Pythagorean theorem, and equilateral vs isosceles triangles.',
    initialQuestion: 'Namaste! I am Vani. In geometry, triangles are fascinating structures. If two angles of a triangle are 50 degrees and 60 degrees, how can we calculate the third angle?',
    starterUtterances: [
      'The sum of all three angles in any triangle is always 180 degrees.',
      'So 50 plus 60 is 110, which leaves 70 degrees.',
      'What is an equilateral triangle?',
      'Can a triangle have two right angles?',
      'How does Pythagoras theorem work for right-angled triangles?',
      'Thank you Vani, that helps me with my homework! Goodbye.',
    ],
  },
];
