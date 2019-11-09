import React from 'react'

const Pagination = ({ employeePerPage, totalEmployees, paginate, currentPage }) => {
    const pageNumbers = [];
    employeePerPage = parseInt(employeePerPage);
    for (let i = 1; i <= Math.ceil(totalEmployees / employeePerPage); i++) {
        pageNumbers.push(i)
    }
    return (
        <div>
            <nav>
                <ul className="pagination">
                    {pageNumbers.map(number => (
                        <li key={number} className="page-item">
                            <a onClick={() => paginate(number)} className={(currentPage === number ? 'pagination-active ': '') + 'page-link'}>
                                {number}
                            </a>
                        </li>
                    ))}
                </ul>  
           </nav>
        </div>
    )
}

export default Pagination