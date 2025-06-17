from api.paginations import PageNumberCountPagination


class LeaderBoardPagination(PageNumberCountPagination):
    page_size = 50
    max_page_size = 50


class ContributorsPagination(PageNumberCountPagination):
    page_size = 5
