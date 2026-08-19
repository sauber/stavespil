Word list is documented on
https://korpus.dsl.dk/resources/licences/dsl-open.html

Download list of words from https://korpus.dsl.dk/download/freq-lemma.zip

Inside the zip file are two files:

- freq-30k-ex.txt
- freq-30k-in.txt

Use the `freq-30k-ex.txt` as source. The file has a word on each line, and three
columns on each line.

- First column is word type. Ignore this column.
- Second column is the word.
- Third number is frequency of use in language. Higher number is more frequent.

Use top 2000 most frequently used words having at least two chars.

## Difficulty Scoring

Word difficulty is calculated by four factors with these weights:

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Word length | 25% | len / max |
| Frequency | 25% | 1 - (log(freq) - log(min)) / (log(max) - log(min)) |
| Syllables | 20% | count of vowels / max |
| Danish patterns | 30% | Pattern score / max pattern score |

### Danish Pattern Scoring

The Danish pattern factor detects specific phonological difficulty traps.
Multiple patterns stack additively per word. Raw scores are normalized by
dividing by the global max across all words.

**æ, ø, å are normal Danish letters and do not affect difficulty.**

| Pattern | Points per hit | Detection |
|---------|---------------|-----------|
| Consonant cluster (3+) | 0.04 × (size − 2) | 3+ consecutive consonants; e.g. size 3 → 0.04, size 4 → 0.08 |
| Double consonant | +0.08 | kk, tt, pp, ss, bb, dd, ff, gg, mm, nn, rr, ll |
| Silent d | +0.10 | Vowel + d before another consonant or end-of-word: -nd, -ld, -rd, -gd |
| Silent g | +0.10 | g between two vowels: \<vowel\>g\<vowel\> |
| Silent h | +0.08 | Word-initial hj- or hv- |
| -de ending | +0.06 | Word ends in -de |
| -ig ending | +0.06 | Word ends in -ig |
| r + vowel | +0.04 per r | r adjacent to a vowel on either side; counted once per r |

### Levels

Divide words into levels with an equal amount of words in each level. Level 1
has the easiest words and highest level has most difficult words.

The number of levels is 100.

Cache the generated word list in localStorage using item key `wordList`.
