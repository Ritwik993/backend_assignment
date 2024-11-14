//base - Product.find()
//base - Product.find(email:{"ritwikbhagat2025@gmail.com"})
//bigQ - //search=coder&page=2&category=shortsleeves&rating[gte]=4
// &price[lte]=999&price[gte]=199&limit=5

//bigQ is the entire object that we get on doing console.log(req.query)

class WhereClause {
  constructor(base, bigQ) {
    this.base = base;
    this.bigQ = bigQ;
  }

  search() {
    const searchword = this.bigQ.search
      ? {
          name: {
            $regex: this.bigQ.search,
            $options: "i", // case-insensitive
          }, //email:{"ritwikbhagat2025@gmail.com"} we are trying to construct this format here
        }
      : {};

    this.base = this.base.find({ ...searchword });
    return this;
  }

  // filter method is used to filter the base query (this.base) based on the remaining parameters in this.bigQ after removing search, limit, and page.

  filter() {
    // const copyQ=this.bigQ  we should not write it like this because any changes made to copyQ will also be reflected to bigQ
    //because objects are passed by reference in JavaScript.
    const copyQ = { ...this.bigQ };
    delete copyQ["search"]; //as key value pair so put in double quotes
    delete copyQ["limit"];
    delete copyQ["page"];

    //convert bigQ into a string ==> copyQ
    let stringOfCopyQ = JSON.stringify(copyQ);
    //copyQ is an object and replace method works only on string
    stringOfCopyQ = stringOfCopyQ.replace(
      /\b(gte|lte|gt|lt)\b/g,
      (m) => `$${m}`
    ); //here m stands for matching string
    const jsonofCopyQ = JSON.parse(stringOfCopyQ);
    this.base = this.base.find(jsonofCopyQ);
    // Product.find(email:{"ritwikbhagat2025@gmail.com"},category:{"shortsleeves"})
    return this;
  }

  pager(resultperPage) {
    let currentPage = 1;
    if (this.bigQ.page) {
      currentPage = this.bigQ.page;
    }

    const skipVal = resultperPage * (currentPage - 1);

    this.base = this.base.limit(resultperPage).skip(skipVal);
    return this;
  }
}

//In whereclause that we have constructed order matters. At first we have to do .find() then .limit() .skip() and .filter()

module.exports = WhereClause;
