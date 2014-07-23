TODO
=======

- [x] Stop expanding when reached species
- [x] Don't expand when there's no data available (see 1)
- [X] Use number of descendants (if available?) to order elements, prioritizing the most important and likely to have children data available
- [x] Expand to father... undo expanding, by clicking on root node
- [x] Fix UI left -> right -> left behaviour of graph
- [x] Add information on taxonomic level (Kingdom, ..., ..., Species)
- [x] Fetch every result available, even if they are more than 20. Current system make a single request, fetching only the 20 results. Sort of fixed: we fetch the first 100 results, which is enough for most cases.
- [ ] Fix problems with non-classical taxonomic orders (superfamilies, and other super-... taxons)

1 - Since beings are sorted by number of descendants and people usually choose some of the first one, it is unlikely that they will go into a dead end. 
If they do, they can very easily go back up one level. If we didn't expand, people wouldn't understand why (unless explicit). 

- [ ] When there are no subtaxons, display a message explain it. (people could think it is a program bug, instead a lack of available information)