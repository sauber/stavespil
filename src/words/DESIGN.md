Word list is documented on
https://korpus.dsl.dk/resources/licences/dsl-open.html

Download list of words from https://korpus.dsl.dk/download/freq-lemma.zip

Inside the zip file are two files:

- freq-30k-ex.txt
- freq-30k-in.txt

Use the `freq-30k-ex.txt` as source. The file has a word on each line, and three
columns on each line.

- First columnd is word type. Ignore this column.
- Second column is the word.
- Third number is frequency of use in language. Higher number is more frequent.

Use top 2000 most frequently used words having at least two chars.

Word difficulty is calculated by factors and weights of factor:

| Criteria        | Weight | Calculation                                        |
| --------------- | ------ | -------------------------------------------------- |
| Word length     | 30%    | len / max                                          |
| Frequency       | 25%    | 1 - (log(freq) - log(min)) / (log(max) - log(min)) |
| Syllables       | 20%    | count of vowels / max                              |
| Consonant ratio | 25%    | Ratio of consonants to vowels / max                |

Divide words into levels with an equal amount of words in each level. Level 1
has the easiest words and highest level has most difficult words.

The number of levels is 100.

Cache the generated word list in localStorage using item key `wordList`.
